import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ImageAddRequest } from '@am/interface/image.interface';
import { UB } from '@am/utils/action-builder';

@Injectable({
    providedIn: 'root'
})
export class ImagesService {

    constructor(
        private httpClient: HttpClient
    ) { }

    public uploadImage(file: File): Observable<ImageAddRequest> {
        const data: FormData = new FormData();

        data.append('file', file);
        data.append('title', 'file');

        return this.httpClient.post<ImageAddRequest>(UB(['api', 'images']), data)
    }
}
