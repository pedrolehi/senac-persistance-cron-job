import { systemConfig } from "../config/system.config";
import { LogCollection, Log } from "../schemas/logs.schema";


export class LogSanitizer {
  private static readonly MASK = "**CONFIDENCIAL**";


  private static sanitizeValue(value:any):any {
    if (typeof value !== 'string') return value;
    return this.MASK;
  }

  private static sanitizeObject(obj:unknown): unknown {
    if(!obj || typeof obj !== 'object') return obj

    if(Array.isArray(obj)){
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitizedObj: {[key:string]:unknown} = {};

    for (const [key, value] of Object.entries(obj as object)) {
      if(systemConfig.sensitiveFields.includes(key)){
        sanitizedObj[key] = this.sanitizeValue(value);
      }
      else if (value && typeof value === 'object') {
        sanitizedObj[key] = this.sanitizeObject(value);
      } else{
        sanitizedObj[key] = value;
      }
    }

    return sanitizedObj;
  }

  public static sanitizeLogs(logs: LogCollection): LogCollection {
    return {
      ...logs,
      logs: logs.logs.map((log:Log)=>({...log,response: this.sanitizeObject(log.response)}))
    }
  }

}