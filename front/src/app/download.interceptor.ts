import {
    HttpRequest,
    HttpEvent,
    HttpHandlerFn
} from "@angular/common/http";
import { Observable } from "rxjs";


export function DownloadInterceptor(request: HttpRequest<Record<string, never>>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
    if (request.url.includes('download')) {
        return next(request.clone({
            responseType: "blob",
        }));
    } else {
        return next(request);
    }
}
