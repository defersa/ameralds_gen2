const fs = require('fs');


const PATH_TO_INPUT = './src/app/cdk/icons/icons.list.json';
const PATH_TO_OUTPUT = './src/app/cdk/icons/icons.map.ts';
const PATH_TO_ICONS = './src/assets/icons/';

const iconsList = fs.readFileSync(PATH_TO_INPUT);

if (iconsList) {
    const iconsObject = JSON.parse(iconsList);

    fs.rm(PATH_TO_OUTPUT, () => ({}));

    generateIconsMap(iconsObject);
}

function generateIconsMap(iconsObject) {
    const jsonTab = '    ';
    const line = '\n';
    const iconsType = `export type IconsName = ${Object.keys(iconsObject).map((key) => `'${key}'`).join(' |' + line + jsonTab)};`

    const iconsContent = `export const IconsMap: Record<IconsName, string> = {` + line +
        Object.entries(iconsObject)
            .map(([key, url]) => `${jsonTab}'${key}': \`${fs.readFileSync(PATH_TO_ICONS + url)
                .toString()
                .replace(/\n/gi, '')
                .replace(/\r/gi, '')
                .replace(/    /gi, '')} \``)
            .join(',' + line)
        + line + '};';

    fs.writeFileSync(PATH_TO_OUTPUT, iconsType + line + line + iconsContent);
}
