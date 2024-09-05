export function downloadBlobFile(file: Blob, name: string): void {
    const binaryData: Blob[] = [file];
    const downloadLink: HTMLAnchorElement = document.createElement('a');
    downloadLink.href = window.URL.createObjectURL(new Blob(binaryData, {type: file.type}));
    downloadLink.setAttribute('download', name);

    downloadLink.click();
    downloadLink.remove();
}
