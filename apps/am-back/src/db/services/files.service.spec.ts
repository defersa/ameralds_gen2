import { HttpStatus } from '@nestjs/common';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { AppConfigInterface } from '../../core/config/app-config.module';
import { ApiEntityNames, ApiErrorCodes } from '../../modules/errors/errors.dto';
import { DataSourceService } from '../data-source.service';
import { PrivateFileEntity } from '../entities/files/file.entity';
import { FilesService } from './files.service';


describe('FilesService.getFileAsStream', () => {
    let service: FilesService;
    let directory: string;
    let file: PrivateFileEntity;

    beforeEach(async () => {
        directory = await mkdtemp(join(tmpdir(), 'admin-order-download-'));
        file = Object.assign(new PrivateFileEntity(), {
            id: 13,
            name: 'pattern.pdf',
            path: join(directory, 'pattern.pdf'),
        });
        service = new FilesService(
            { getRepository: jest.fn().mockReturnValue({}) } as unknown as DataSourceService,
            {} as AppConfigInterface,
        );
    });

    afterEach(async () => {
        await rm(directory, { recursive: true, force: true });
    });

    it('streams the file contents', async () => {
        const content = Buffer.from('%PDF-1.7\nfile contents');
        await writeFile(file.path, content);

        const stream = await service.getFileAsStream(file);
        const chunks: Buffer[] = [];

        for await (const chunk of stream) {
            chunks.push(chunk as Buffer);
        }

        expect(Buffer.concat(chunks)).toEqual(content);
    });

    it('returns the standard file error when the file is absent on disk', async () => {
        await expect(service.getFileAsStream(file)).rejects.toMatchObject({
            status: HttpStatus.BAD_REQUEST,
            response: { code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.FILE },
        });
    });

    it('returns the standard file error when part of the path is not a directory', async () => {
        await writeFile(file.path, 'contents');
        file.path = join(file.path, 'missing.pdf');

        await expect(service.getFileAsStream(file)).rejects.toMatchObject({
            status: HttpStatus.BAD_REQUEST,
            response: { code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.FILE },
        });
    });
});
