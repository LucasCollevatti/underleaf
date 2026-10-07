async function schedulePostRegistrationAnalytics() {
  // Underleaf has no hosted post-registration analytics workflow.
}

async function postRegistrationAnalytics() {
  // Kept as a compatibility hook for queued jobs from older installations.
}

export default {
  schedulePostRegistrationAnalytics,
  postRegistrationAnalytics,
}
