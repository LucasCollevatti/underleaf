const OError = require('@overleaf/o-error')

// Error class for legacy errors so they inherit OError while staying
// backward-compatible (can be instantiated with string as argument instead
// of object)
class BackwardCompatibleError extends OError {
  /**
   * @param {string | { message?: string, info?: Object, cause?: unknown }} messageOrOptions
   * @param {Object} [info]
   * @param {unknown} [cause]
   */
  constructor(messageOrOptions, info, cause) {
    if (typeof messageOrOptions === 'string') {
      super(messageOrOptions, info, cause)
    } else if (
      typeof messageOrOptions === 'object' &&
      messageOrOptions !== null
    ) {
      const {
        message,
        info: optionsInfo,
        cause: optionsCause,
      } = messageOrOptions
      super(message, optionsInfo, optionsCause)
    } else {
      super(undefined, info, cause)
    }
  }
}

// Error class that facilitates the migration to OError v3 by providing
// a signature in which the 2nd argument can be an object containing
// the `info` object.
class OErrorV2CompatibleError extends OError {
  constructor(message, options) {
    if (options) {
      super(message, options.info)
    } else {
      super(message)
    }
  }
}

class NotFoundError extends BackwardCompatibleError {}

class ForbiddenError extends BackwardCompatibleError {}

class ServiceNotConfiguredError extends BackwardCompatibleError {}

class TooManyRequestsError extends BackwardCompatibleError {}

class TooManyFilesError extends BackwardCompatibleError {}

class ResourceGoneError extends BackwardCompatibleError {}

class DuplicateNameError extends OError {}

class InvalidNameError extends BackwardCompatibleError {}

class UnsupportedFileTypeError extends BackwardCompatibleError {}

class FileTooLargeError extends BackwardCompatibleError {}

class DocumentConversionError extends OError {}

class UnsupportedExportRecordsError extends BackwardCompatibleError {}

class V1HistoryNotSyncedError extends BackwardCompatibleError {}

class ProjectHistoryDisabledError extends BackwardCompatibleError {}

class V1ConnectionError extends BackwardCompatibleError {}

class UnconfirmedEmailError extends BackwardCompatibleError {}

class EmailExistsError extends OErrorV2CompatibleError {
  constructor(options) {
    super('Email already exists', options)
  }
}

class InvalidError extends BackwardCompatibleError {}

class NotifyGroupAdminError extends OError {}

class NotInV2Error extends BackwardCompatibleError {}

class SLInV2Error extends BackwardCompatibleError {}

class ThirdPartyIdentityExistsError extends BackwardCompatibleError {
  constructor(arg) {
    super(arg)
    if (!this.message) {
      this.message =
        'provider and external id already linked to another account'
    }
  }
}

class ThirdPartyUserNotFoundError extends BackwardCompatibleError {
  constructor(arg) {
    super(arg)
    if (!this.message) {
      this.message = 'user not found for provider and external id'
    }
  }
}

class OutputFileFetchFailedError extends OError {}

class SubscriptionAdminDeletionError extends OErrorV2CompatibleError {
  constructor(options) {
    super('subscription admins cannot be deleted', options)
  }
}

class SubscriptionNotFoundError extends OErrorV2CompatibleError {
  constructor(options) {
    super('subscription not found', options)
  }
}

class ProjectNotFoundError extends OErrorV2CompatibleError {
  constructor(options) {
    super('project not found', options)
  }
}

class UserNotFoundError extends OErrorV2CompatibleError {
  constructor(options) {
    super('user not found', options)
  }
}

class UserNotCollaboratorError extends OErrorV2CompatibleError {
  constructor(options) {
    super('user not a collaborator', options)
  }
}

class DocHasRangesError extends OErrorV2CompatibleError {
  constructor(options) {
    super('document has ranges', options)
  }
}

class InvalidQueryError extends OErrorV2CompatibleError {
  constructor(options) {
    super('invalid search query', options)
  }
}

class AffiliationError extends OError {}

class InvalidEmailError extends OError {
  get i18nKey() {
    return 'invalid_email'
  }
}

class InvalidInstitutionalEmailError extends OError {
  get i18nKey() {
    return 'invalid_institutional_email'
  }
}

class NonDeletableEntityError extends OError {
  get i18nKey() {
    return 'non_deletable_entity'
  }
}

class FoundConnectedClientsError extends OError {
  constructor(nConnectedClients) {
    super(`found ${nConnectedClients} remaining connected clients`)
  }
}

class ConcurrentLoadingOfDocsDetectedError extends OError {
  constructor() {
    super('concurrent loading of docs detected')
  }
}

class DomainAlreadyExistsError extends OErrorV2CompatibleError {}

module.exports = {
  OError,
  BackwardCompatibleError,
  NotFoundError,
  ForbiddenError,
  ServiceNotConfiguredError,
  TooManyRequestsError,
  TooManyFilesError,
  ResourceGoneError,
  DuplicateNameError,
  InvalidNameError,
  UnsupportedFileTypeError,
  FileTooLargeError,
  DocumentConversionError,
  UnsupportedExportRecordsError,
  V1HistoryNotSyncedError,
  ProjectHistoryDisabledError,
  V1ConnectionError,
  UnconfirmedEmailError,
  EmailExistsError,
  InvalidError,
  NotifyGroupAdminError,
  NotInV2Error,
  OutputFileFetchFailedError,

  SLInV2Error,
  ThirdPartyIdentityExistsError,
  ThirdPartyUserNotFoundError,
  SubscriptionAdminDeletionError,
  SubscriptionNotFoundError,
  ProjectNotFoundError,
  UserNotFoundError,
  UserNotCollaboratorError,
  DocHasRangesError,
  InvalidQueryError,
  AffiliationError,
  InvalidEmailError,
  InvalidInstitutionalEmailError,
  NonDeletableEntityError,
  FoundConnectedClientsError,
  ConcurrentLoadingOfDocsDetectedError,
  DomainAlreadyExistsError,
}
