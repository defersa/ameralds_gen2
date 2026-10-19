import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { EnvironmentProviders } from '@angular/core';
import { Observable } from 'rxjs';
import { provideDefaultClient } from './api-v2';
import { DateInterceptor } from './api-v2/utils/date-transformer';


class JsonDateInterceptor implements HttpInterceptor {
    private readonly dateInterceptor = new DateInterceptor();

    public intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        return request.responseType === 'json'
            ? this.dateInterceptor.intercept(request, next)
            : next.handle(request);
    }
}

export function provideApiClient(): EnvironmentProviders {
    return provideDefaultClient({
        basePath: '',
        enableDateTransform: false,
        interceptors: [JsonDateInterceptor],
    });
}
