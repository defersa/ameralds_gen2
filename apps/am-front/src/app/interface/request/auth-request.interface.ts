import { FormErrorResponse } from "@am-front/cdk/forms/form-async-error.handler";
import { IResultRequest } from "@am-front/interface/request.interface";

export type AuthRegistrationRequest = FormErrorResponse & IResultRequest;
