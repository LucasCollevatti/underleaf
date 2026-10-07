import { BackwardCompatibleError } from '../Errors/Errors.js'

class CompileFailedError extends BackwardCompatibleError {}

class AccessDeniedError extends BackwardCompatibleError {}

class BadEntityTypeError extends BackwardCompatibleError {}

class BadDataError extends BackwardCompatibleError {}

class ProjectNotFoundError extends BackwardCompatibleError {}

class V1ProjectNotFoundError extends BackwardCompatibleError {}

class SourceFileNotFoundError extends BackwardCompatibleError {}

class NotOriginalImporterError extends BackwardCompatibleError {}

class FileCannotRefreshError extends BackwardCompatibleError {}

export default {
  CompileFailedError,
  AccessDeniedError,
  BadEntityTypeError,
  BadDataError,
  ProjectNotFoundError,
  V1ProjectNotFoundError,
  SourceFileNotFoundError,
  NotOriginalImporterError,
  FileCannotRefreshError,
}
