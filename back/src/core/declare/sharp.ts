import * as path from 'path';
import * as sharp from 'sharp';


async function fddgg(image: Express.Multer.File) {
    const originalName = path.parse(image.originalname).name;
    const filename = Date.now() + '-' + originalName + '.webp';

    await sharp(image.buffer)
        .resize(800)
        .webp({ effort: 3 })
        .toFile(path.join('uploads', filename));

    return filename;
}
