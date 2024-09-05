import { FormErrorResponse } from "@am/cdk/forms/form-async-error.handler";
import { IResultRequest } from "@am/interface/request.interface";

export type AuthRegistrationRequest = FormErrorResponse & IResultRequest;
