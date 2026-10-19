import { HttpException, HttpStatus } from '@nestjs/common';
import { ModelState } from '../../abstract/abstract.model';
import { DataSourceService } from '../../data-source.service';
import { PrivateFileEntity } from '../../entities/files/file.entity';
import { PatternSizeEntity } from '../../entities/patterns/pattern-size.entity';
import { SizeEntity } from '../../entities/patterns/size.entity';
import { ApiEntityNames, ApiErrorCodes } from '../../../modules/errors/errors.dto';
import { PatternSizeDto } from '../../../modules/patterns/patterns.dto';
import { FilesService } from '../files.service';
import { PatternsSizeService } from './pattern-sizes.service';
import { SizesService } from './sizes.service';

describe('PatternsSizeService files', () => {
    let service: PatternsSizeService;
    let current: PatternSizeEntity;
    let repository: { create: jest.Mock; findOne: jest.Mock; save: jest.Mock };
    let files: { getPrivateFile: jest.Mock; setUsageStatus: jest.Mock };
    const data: PatternSizeDto = { id: 21, size: 3, cbb: 11, png: 14, pdf: 13 };
    const size = Object.assign(new SizeEntity(), { id: 3, value: 36 });
    const file = (id: number) => Object.assign(new PrivateFileEntity(), { id });

    beforeEach(() => {
        current = Object.assign(new PatternSizeEntity(), {
            id: 21,
            state: ModelState.ACTIVE,
            size,
            cbb: file(111),
            png: file(114),
            pdf: file(113),
        });
        repository = {
            create: jest.fn((value) => Object.assign(new PatternSizeEntity(), value)),
            findOne: jest.fn().mockResolvedValue(current),
            save: jest.fn(async (value) => value),
        };
        files = {
            getPrivateFile: jest.fn(async (id: number) => file(id)),
            setUsageStatus: jest.fn().mockResolvedValue(undefined),
        };
        service = new PatternsSizeService(
            { getRepository: jest.fn().mockReturnValue(repository) } as unknown as DataSourceService,
            { getSize: jest.fn().mockResolvedValue(size) } as unknown as SizesService,
            files as unknown as FilesService,
        );
    });

    it('creates a size using only CBB, PNG and PDF files', async () => {
        const result = await service.createPatternSize(data);

        expect(files.getPrivateFile.mock.calls).toEqual([[11], [14], [13]]);
        expect(files.setUsageStatus.mock.calls).toEqual([
            [file(13), true], [file(14), true], [file(11), true],
        ]);
        expect(repository.create).toHaveBeenCalledWith({
            size, cbb: file(11), png: file(14), pdf: file(13),
        });
        expect(repository.save).toHaveBeenCalledWith(result);
    });

    it('replaces the three files, releases old files and preserves the parsed schema', async () => {
        const previous = { cbb: current.cbb, png: current.png, pdf: current.pdf };
        current.parsed = {
            name: null, author: null, circumference: 21, repeatOfColors: null,
            rowsPerRepeat: null, totalRows: null, declaredTotalBeads: null,
            sequence: [{ color: 'a', count: 21 }], totalBeads: 21,
        };
        const parsed = current.parsed;

        await expect(service.editPatternSize(21, data)).resolves.toBe(current);

        expect(repository.findOne).toHaveBeenCalledWith({
            where: { id: 21, state: ModelState.ACTIVE },
            relations: { size: true, cbb: true, png: true, pdf: true },
        });
        expect(files.getPrivateFile.mock.calls).toEqual([[11], [14], [13]]);
        expect(files.setUsageStatus.mock.calls).toEqual([
            [previous.cbb, false], [previous.png, false], [previous.pdf, false],
            [file(13), true], [file(14), true], [file(11), true],
        ]);
        expect(current).toMatchObject({ cbb: file(11), png: file(14), pdf: file(13) });
        expect(current.parsed).toBe(parsed);
        expect(repository.save).toHaveBeenCalledWith(current);
    });

    it('does not access files when the size is missing', async () => {
        repository.findOne.mockResolvedValue(null);

        await expect(service.editPatternSize(999, data)).rejects.toMatchObject({
            status: HttpStatus.BAD_REQUEST,
            response: { code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.PATTERN_SIZE },
        });
        expect(files.getPrivateFile).not.toHaveBeenCalled();
        expect(files.setUsageStatus).not.toHaveBeenCalled();
        expect(repository.save).not.toHaveBeenCalled();
    });

    it('does not release old files or save when a replacement file is unavailable', async () => {
        const error = new HttpException(
            { code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.FILE },
            HttpStatus.BAD_REQUEST,
        );
        files.getPrivateFile.mockRejectedValueOnce(error);

        await expect(service.editPatternSize(21, data)).rejects.toBe(error);
        expect(files.setUsageStatus).not.toHaveBeenCalled();
        expect(repository.save).not.toHaveBeenCalled();
    });

    it('releases CBB, PNG and PDF when removing a size', async () => {
        await expect(service.removePatternSize(current)).resolves.toBe(current);

        expect(current.state).toBe(ModelState.INACTIVE);
        expect(files.setUsageStatus.mock.calls).toEqual([
            [current.cbb, false], [current.png, false], [current.pdf, false],
        ]);
        expect(repository.save).toHaveBeenCalledWith(current);
    });
});
