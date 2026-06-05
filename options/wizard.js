/**
 * Options Page – Onboarding Wizard
 * Full wizard flow: token help, validation, repo setup, environment check, first sync.
 */

import { getMessage } from '../lib/i18n.js';
import { createConnectionApi, ensureProviderHostPermission, normalizeGitProvider } from '../lib/connection-settings.js';
import { getProviderCaps } from '../lib/git-provider-common.js';
import {
  applyProviderFormUi,
  providerNeedsHostPermission,
  renderProviderOptions,
} from '../lib/provider-ui.js';
import { checkPathSetup, waitForRemoteBaseline } from '../lib/onboarding.js';
import { formatSyncProgress, runSyncPortAction } from '../lib/sync-progress.js';

let _saveSettings = null;

const validationSpinner = document.getElementById('validation-spinner');
const validationResult = document.getElementById('validation-result');
const tokenInput = document.getElementById('token');
const gitProviderSelect = document.getElementById('git-provider');
const serverUrlInput = document.getElementById('server-url');
const ownerInput = document.getElementById('owner');
const repoInput = document.getElementById('repo');
const branchInput = document.getElementById('branch');
const filepathInput = document.getElementById('filepath');
const onboardingConfirm = document.getElementById('onboarding-confirm');
const onboardingConfirmText = document.getElementById('onboarding-confirm-text');
const onboardingConfirmYesBtn = document.getElementById('onboarding-confirm-yes-btn');
const onboardingConfirmNoBtn = document.getElementById('onboarding-confirm-no-btn');
const onboardingWizardScreen = document.getElementById('onboarding-wizard-screen');
const settingsShell = document.getElementById('settings-shell');
const onboardingWizardProgress = document.getElementById('onboarding-wizard-progress');
const onboardingWizardStepTitle = document.getElementById('onboarding-wizard-step-title');
const onboardingWizardStepText = document.getElementById('onboarding-wizard-step-text');
const onboardingWizardResult = document.getElementById('onboarding-wizard-result');
const wizardStatusEl = document.getElementById('wizard-status');
const onboardingWizardSpinner = document.getElementById('onboarding-wizard-spinner');
const onboardingWizardHint = document.getElementById('onboarding-wizard-hint');
const onboardingWizardElapsed = document.getElementById('onboarding-wizard-elapsed');
const onboardingWizardActionBtn = document.getElementById('onboarding-wizard-action-btn');
const onboardingWizardBackBtn = document.getElementById('onboarding-wizard-back-btn');
const onboardingWizardNextBtn = document.getElementById('onboarding-wizard-next-btn');
const onboardingWizardSkipBtn = document.getElementById('onboarding-wizard-skip-btn');
const onboardingWizardStartBtn = document.getElementById('onboarding-wizard-start-btn');
const onboardingWizardProviderGroup = document.getElementById('onboarding-wizard-provider-group');
const onboardingWizardGitProviderSelect = document.getElementById('onboarding-wizard-git-provider');
const onboardingWizardServerUrlGroup = document.getElementById('onboarding-wizard-server-url-group');
const onboardingWizardServerUrlInput = document.getElementById('onboarding-wizard-server-url');
const onboardingWizardGheDisclosure = document.getElementById('onboarding-wizard-ghe-disclosure');
const onboardingWizardGheEnabled = document.getElementById('onboarding-wizard-ghe-enabled');
const onboardingWizardTokenHelp = document.getElementById('onboarding-wizard-token-help');
const onboardingWizardTokenHelpGithub = document.getElementById('onboarding-wizard-token-help-github');
const onboardingWizardTokenHelpGitea = document.getElementById('onboarding-wizard-token-help-gitea');
const onboardingWizardHasTokenGroup = document.getElementById('onboarding-wizard-has-token-group');
const onboardingWizardHasTokenSelect = document.getElementById('onboarding-wizard-has-token');
const onboardingWizardTokenGroup = document.getElementById('onboarding-wizard-token-group');
const onboardingWizardTokenInput = document.getElementById('onboarding-wizard-token');
const onboardingWizardRepoFlowGroup = document.getElementById('onboarding-wizard-repo-flow-group');
const onboardingWizardRepoFlowSelect = document.getElementById('onboarding-wizard-repo-flow');
const onboardingWizardRepoGroup = document.getElementById('onboarding-wizard-repo-group');
const onboardingWizardOwnerInput = document.getElementById('onboarding-wizard-owner');
const onboardingWizardRepoInput = document.getElementById('onboarding-wizard-repo');
const onboardingWizardBranchInput = document.getElementById('onboarding-wizard-branch');
const onboardingWizardPathInput = document.getElementById('onboarding-wizard-path');
const connectionPathInitGroup = document.getElementById('connection-path-init-group');
const connectionPathInitBtn = document.getElementById('connection-path-init-btn');
const connectionPathInitHint = document.getElementById('connection-path-init-hint');
const validateBtn = document.getElementById('validate-btn');

export const WIZARD_STEPS = ['welcome', 'provider', 'tokenHelp', 'hasToken', 'tokenInput', 'repoDecision', 'repoDetails', 'environment', 'finish'];
export const wizardState = {
  active: false,
  stepIndex: 0,
  gitProvider: 'github',
  serverUrl: '',
  tokenValidated: false,
  environmentChecked: false,
  pathStatus: null,
  username: '',
  repoRef: '',
  firstSyncDone: false,
  repoFlow: 'manual',
};

function resetWizardState() {
  wizardState.stepIndex = 0;
  wizardState.gitProvider = 'github';
  wizardState.serverUrl = '';
  wizardState.tokenValidated = false;
  wizardState.environmentChecked = false;
  wizardState.pathStatus = null;
  wizardState.username = '';
  wizardState.repoRef = '';
  wizardState.firstSyncDone = false;
  wizardState.repoFlow = 'manual';
}

async function persistWizardState(completed, dismissed) {
  await chrome.storage.sync.set({
    ['onboardingWizardCompleted']: completed === true,
    ['onboardingWizardDismissed']: dismissed === true,
  });
}

export async function startOnboardingWizard({ manual = false } = {}) {
  resetWizardState();
  onboardingWizardTokenInput.value = tokenInput.value || '';
  renderProviderOptions(onboardingWizardGitProviderSelect, gitProviderSelect?.value || 'github');
  if (onboardingWizardServerUrlInput) {
    onboardingWizardServerUrlInput.value = serverUrlInput?.value || '';
  }
  updateWizardProviderUi();
  onboardingWizardOwnerInput.value = ownerInput.value || '';
  onboardingWizardRepoInput.value = repoInput.value || '';
  onboardingWizardBranchInput.value = branchInput.value || 'main';
  onboardingWizardPathInput.value = filepathInput.value || 'bookmarks';
  onboardingWizardHasTokenSelect.value = 'yes';
  onboardingWizardRepoFlowSelect.value = 'manual';
  wizardState.active = true;
  onboardingWizardScreen.style.display = '';
  settingsShell.style.display = 'none';
  onboardingWizardResult.textContent = '';
  onboardingWizardResult.className = 'validation-result';
  if (manual) {
    await persistWizardState(false, false);
  }
  renderOnboardingWizardStep();
}

async function completeOnboardingWizard() {
  wizardState.active = false;
  onboardingWizardScreen.style.display = 'none';
  settingsShell.style.display = '';
  await persistWizardState(true, false);
}

async function dismissOnboardingWizard() {
  wizardState.active = false;
  onboardingWizardScreen.style.display = 'none';
  settingsShell.style.display = '';
  await persistWizardState(false, true);
  showValidation(getMessage('options_onboardingWizardDismissed'), 'success');
}

function setWizardResult(message, type = 'success') {
  onboardingWizardSpinner.style.display = 'none';
  onboardingWizardHint.textContent = message;
  onboardingWizardElapsed.textContent = '';
  wizardStatusEl.className = `wizard-status ${type}`;
  wizardStatusEl.style.display = 'flex';
}

function setWizardBusy(isBusy, loadingMessage = '') {
  onboardingWizardBackBtn.disabled = isBusy || wizardState.stepIndex === 0;
  onboardingWizardNextBtn.disabled = isBusy;
  onboardingWizardSkipBtn.disabled = isBusy;
  onboardingWizardActionBtn.disabled = isBusy;
  if (isBusy) {
    onboardingWizardSpinner.style.display = 'inline-block';
    onboardingWizardHint.textContent = loadingMessage || '';
    onboardingWizardElapsed.textContent = '';
    wizardStatusEl.className = 'wizard-status';
    wizardStatusEl.style.display = 'flex';
  } else {
    wizardStatusEl.style.display = 'none';
    onboardingWizardHint.textContent = '';
    onboardingWizardElapsed.textContent = '';
  }
}

function isGiteaFamilyProvider(provider) {
  return ['gitea', 'forgejo', 'codeberg', 'gogs'].includes(provider);
}

function updateWizardProviderUi() {
  const provider = normalizeGitProvider(onboardingWizardGitProviderSelect?.value);
  applyProviderFormUi(
    {
      serverUrlGroup: onboardingWizardServerUrlGroup,
      serverUrlInput: onboardingWizardServerUrlInput,
      tokenInput: onboardingWizardTokenInput,
      ownerInput: onboardingWizardOwnerInput,
      gheDisclosureGroup: onboardingWizardGheDisclosure,
    },
    provider,
    { gheEnabled: onboardingWizardGheEnabled?.checked }
  );
  if (onboardingWizardTokenHelpGithub) {
    onboardingWizardTokenHelpGithub.classList.toggle('hidden', isGiteaFamilyProvider(provider) || provider === 'gitlab');
  }
  if (onboardingWizardTokenHelpGitea) {
    onboardingWizardTokenHelpGitea.classList.toggle('hidden', !isGiteaFamilyProvider(provider));
  }
  const helpLink = onboardingWizardTokenHelpGithub?.querySelector('a');
  if (helpLink && provider === 'github') {
    helpLink.href = 'https://github.com/settings/tokens/new?scopes=repo&description=GitSyncMarks';
    helpLink.textContent = getMessage('options_onboardingWizardTokenHelpLink');
    helpLink.onclick = null;
  }
}

async function ensureWizardHostPermission(fields) {
  const caps = getProviderCaps(fields.gitProvider);
  const serverUrl = fields.serverUrl || caps.defaultServerUrl || '';
  if (!providerNeedsHostPermission(fields.gitProvider, serverUrl)) return true;
  if (!serverUrl) return false;
  const { granted } = await ensureProviderHostPermission(fields.gitProvider, serverUrl);
  if (!granted) {
    const msg = getMessage('options_hostPermissionDenied');
    showValidation(msg, 'error');
    setWizardResult(msg, 'error');
  }
  return granted;
}

function wizardServerUrlRequired(fields) {
  const caps = getProviderCaps(fields.gitProvider);
  const serverUrl = fields.serverUrl || caps.defaultServerUrl || '';
  return caps.requireServerUrl && !serverUrl;
}

function getWizardConnectionFields(overrides = {}) {
  return {
    token: overrides.token ?? onboardingWizardTokenInput.value.trim(),
    owner: overrides.owner ?? onboardingWizardOwnerInput.value.trim(),
    repo: overrides.repo ?? onboardingWizardRepoInput.value.trim(),
    branch: overrides.branch ?? (onboardingWizardBranchInput.value.trim() || 'main'),
    gitProvider: normalizeGitProvider(overrides.gitProvider ?? onboardingWizardGitProviderSelect?.value ?? wizardState.gitProvider),
    serverUrl: overrides.serverUrl ?? onboardingWizardServerUrlInput?.value?.trim() ?? wizardState.serverUrl ?? '',
  };
}

function syncWizardProviderState() {
  wizardState.gitProvider = normalizeGitProvider(onboardingWizardGitProviderSelect?.value);
  wizardState.serverUrl = onboardingWizardServerUrlInput?.value?.trim() || '';
}

function wizardStepText(stepKey) {
  switch (stepKey) {
    case 'welcome':
      return {
        title: getMessage('options_onboardingWizardStepWelcomeTitle'),
        text: getMessage('options_onboardingWizardStepWelcomeText'),
      };
    case 'provider':
      return {
        title: getMessage('options_onboardingWizardStepProviderTitle'),
        text: getMessage('options_onboardingWizardStepProviderText'),
      };
    case 'tokenHelp':
      return {
        title: getMessage('options_onboardingWizardStepTokenHelpTitle'),
        text: getMessage('options_onboardingWizardStepTokenHelpText'),
      };
    case 'hasToken':
      return {
        title: getMessage('options_onboardingWizardStepHasTokenTitle'),
        text: getMessage('options_onboardingWizardStepHasTokenText'),
      };
    case 'tokenInput':
      return {
        title: getMessage('options_onboardingWizardStepTokenTitle'),
        text: getMessage('options_onboardingWizardStepTokenText'),
      };
    case 'repoDecision':
      return {
        title: getMessage('options_onboardingWizardStepRepoDecisionTitle'),
        text: getMessage('options_onboardingWizardStepRepoDecisionText'),
      };
    case 'repoDetails':
      return {
        title: getMessage('options_onboardingWizardStepRepoTitle'),
        text: getMessage('options_onboardingWizardStepRepoText'),
      };
    case 'environment':
      return {
        title: getMessage('options_onboardingWizardStepValidateTitle'),
        text: wizardState.environmentChecked
          ? (wizardState.pathStatus === 'hasBookmarks'
            ? getMessage('options_onboardingWizardStepSyncTextExisting')
            : getMessage('options_onboardingWizardStepSyncTextEmpty'))
          : getMessage('options_onboardingWizardStepValidateText'),
      };
    default:
      return {
        title: getMessage('options_onboardingWizardStepFinishTitle'),
        text: getMessage('options_onboardingWizardStepFinishText'),
      };
  }
}

export function renderOnboardingWizardStep() {
  if (!wizardState.active) return;
  const stepKey = WIZARD_STEPS[wizardState.stepIndex];
  const step = wizardStepText(stepKey);
  onboardingWizardProgress.textContent = `${wizardState.stepIndex + 1} / ${WIZARD_STEPS.length}`;
  onboardingWizardStepTitle.textContent = step.title;
  onboardingWizardStepText.textContent = step.text;

  onboardingWizardBackBtn.disabled = wizardState.stepIndex === 0;
  onboardingWizardSkipBtn.style.display = stepKey === 'finish' ? 'none' : '';
  onboardingWizardNextBtn.textContent = stepKey === 'finish'
    ? getMessage('options_onboardingWizardFinish')
    : getMessage('options_onboardingWizardNext');

  onboardingWizardTokenHelp.style.display = stepKey === 'tokenHelp' ? '' : 'none';
  onboardingWizardProviderGroup.style.display = stepKey === 'provider' ? '' : 'none';
  if (['provider', 'tokenHelp', 'tokenInput', 'repoDetails'].includes(stepKey)) {
    updateWizardProviderUi();
  }
  onboardingWizardHasTokenGroup.style.display = stepKey === 'hasToken' ? '' : 'none';
  onboardingWizardTokenGroup.style.display = stepKey === 'tokenInput' ? '' : 'none';
  onboardingWizardRepoFlowGroup.style.display = stepKey === 'repoDecision' ? '' : 'none';
  onboardingWizardRepoGroup.style.display = stepKey === 'repoDetails' ? '' : 'none';
  wizardStatusEl.style.display = 'none';

  onboardingWizardActionBtn.style.display = 'none';
}

export function showOnboardingConfirm(message, yesButtonLabel) {
  return new Promise((resolve) => {
    onboardingConfirmText.textContent = message;
    onboardingConfirmYesBtn.textContent = yesButtonLabel;
    onboardingConfirm.style.display = 'flex';
    validationSpinner.style.display = 'none';

    const handleYes = () => {
      onboardingConfirmYesBtn.removeEventListener('click', handleYes);
      onboardingConfirmNoBtn.removeEventListener('click', handleNo);
      resolve(true);
    };
    const handleNo = () => {
      onboardingConfirmYesBtn.removeEventListener('click', handleYes);
      onboardingConfirmNoBtn.removeEventListener('click', handleNo);
      resolve(false);
    };
    onboardingConfirmYesBtn.addEventListener('click', handleYes);
    onboardingConfirmNoBtn.addEventListener('click', handleNo);
  });
}

export function hideOnboardingConfirm() {
  onboardingConfirm.style.display = 'none';
}

export function hideConnectionPathInitAction() {
  connectionPathInitGroup.style.display = 'none';
  connectionPathInitGroup.dataset.path = '';
  connectionPathInitHint.textContent = '';
}

function showConnectionPathInitAction(basePath) {
  connectionPathInitGroup.dataset.path = basePath;
  connectionPathInitHint.textContent = getMessage('options_onboardingInitPathHint', [basePath]);
  connectionPathInitGroup.style.display = '';
}

async function initializePathAndRunFirstPush(onProgress) {
  await _saveSettings();
  const connection = getConnectionFormFieldsFromPage();
  const result = await runSyncPortAction(
    'bootstrapFirstSync',
    { connection },
    onProgress
  );
  if (result?.success) return;
  throw new Error(result?.message || 'Push failed');
}

async function validateAndInspectRepo({ offerInteractiveActions = true } = {}) {
  await _saveSettings();
  const fields = getConnectionFormFieldsFromPage();

  if (!fields.token) {
    showValidation(getMessage('options_pleaseEnterToken'), 'error');
    return { ok: false };
  }
  if (wizardServerUrlRequired(fields)) {
    showValidation(getMessage('options_serverUrlRequired'), 'error');
    return { ok: false };
  }
  if (!(await ensureWizardHostPermission(fields))) {
    return { ok: false };
  }

  showValidation(getMessage('options_checking'), 'loading');

  try {
    const api = createConnectionApi(fields);

    const tokenResult = await api.validateToken();
    if (!tokenResult.valid) {
      showValidation(getMessage('options_invalidToken'), 'error');
      return { ok: false };
    }

    if (
      fields.gitProvider === 'github' &&
      !tokenResult.ambiguous &&
      !tokenResult.scopes.includes('repo')
    ) {
      hideConnectionPathInitAction();
      showValidation(getMessage('options_tokenValidMissingScope', [tokenResult.username]), 'error');
      return { ok: false };
    }

    if (fields.owner && fields.repo) {
      const repoExists = await api.checkRepo();
      if (!repoExists) {
        hideConnectionPathInitAction();
        showValidation(getMessage('options_tokenValidRepoNotFound', [tokenResult.username, `${fields.owner}/${fields.repo}`]), 'error');
        return { ok: false };
      }
      const basePath = filepathInput.value.trim() || 'bookmarks';
      const pathCheck = await checkPathSetup(api, basePath);
      if (offerInteractiveActions && (pathCheck.status === 'unreachable' || pathCheck.status === 'empty')) {
        showConnectionPathInitAction(basePath);
        showValidation(getMessage('options_connectionOk', [tokenResult.username, `${fields.owner}/${fields.repo}`]), 'success');
        return {
          ok: true,
          username: tokenResult.username,
          repoRef: `${fields.owner}/${fields.repo}`,
          pathStatus: pathCheck.status,
        };
      }
      hideConnectionPathInitAction();
      if (offerInteractiveActions && pathCheck.status === 'hasBookmarks') {
        const confirmed = await showOnboardingConfirm(
          getMessage('options_onboardingPullNow'),
          getMessage('options_onboardingPullBtn')
        );
        hideOnboardingConfirm();
        if (confirmed) {
          try {
            await _saveSettings();
            showValidation(getMessage('popup_syncing'), 'loading');
            const pullResult = await runSyncPortAction('pull', {}, (payload) => {
              showValidation(formatSyncProgress(payload), 'loading');
            });
            if (!pullResult?.success) {
              showValidation(pullResult?.message || 'Pull failed', 'error');
              return;
            }
            showValidation(getMessage('options_onboardingPullSuccess'), 'success');
          } catch (pullErr) {
            showValidation(getMessage('options_error', [pullErr.message]), 'error');
          }
        } else {
          showValidation(getMessage('options_connectionOk', [tokenResult.username, `${fields.owner}/${fields.repo}`]), 'success');
        }
        return;
      }
      showValidation(getMessage('options_connectionOk', [tokenResult.username, `${fields.owner}/${fields.repo}`]), 'success');
      return {
        ok: true,
        username: tokenResult.username,
        repoRef: `${fields.owner}/${fields.repo}`,
        pathStatus: pathCheck.status,
      };
    } else {
      hideConnectionPathInitAction();
      showValidation(getMessage('options_tokenValidSpecifyRepo', [tokenResult.username]), 'success');
      return {
        ok: true,
        username: tokenResult.username,
        repoRef: '',
        pathStatus: 'empty',
      };
    }
  } catch (err) {
    hideConnectionPathInitAction();
    showValidation(getMessage('options_error', [err.message]), 'error');
    return { ok: false, error: err };
  }
}

function getConnectionFormFieldsFromPage() {
  return {
    token: tokenInput?.value?.trim() ?? '',
    owner: ownerInput?.value?.trim() ?? '',
    repo: repoInput?.value?.trim() ?? '',
    branch: branchInput?.value?.trim() || 'main',
    gitProvider: normalizeGitProvider(gitProviderSelect?.value),
    serverUrl: serverUrlInput?.value?.trim() ?? '',
  };
}

function syncWizardFieldsToConnectionForm() {
  tokenInput.value = onboardingWizardTokenInput.value.trim();
  if (gitProviderSelect && onboardingWizardGitProviderSelect) {
    gitProviderSelect.value = onboardingWizardGitProviderSelect.value;
  }
  if (serverUrlInput && onboardingWizardServerUrlInput) {
    serverUrlInput.value = onboardingWizardServerUrlInput.value.trim();
  }
  ownerInput.value = onboardingWizardOwnerInput.value.trim();
  repoInput.value = onboardingWizardRepoInput.value.trim();
  branchInput.value = onboardingWizardBranchInput.value.trim() || 'main';
  filepathInput.value = onboardingWizardPathInput.value.trim() || 'bookmarks';
  syncWizardProviderState();
}

async function runWizardTokenValidation() {
  onboardingWizardResult.textContent = '';
  syncWizardProviderState();
  const fields = getWizardConnectionFields();
  if (!fields.token) {
    setWizardResult(getMessage('options_pleaseEnterToken'), 'error');
    return false;
  }
  if (wizardServerUrlRequired(fields)) {
    setWizardResult(getMessage('options_serverUrlRequired'), 'error');
    return false;
  }
  if (!(await ensureWizardHostPermission(fields))) {
    return false;
  }
  const api = createConnectionApi({ ...fields, owner: 'x', repo: 'x' });
  const tokenResult = await api.validateToken();
  if (!tokenResult.valid) {
    setWizardResult(getMessage('options_invalidToken'), 'error');
    return false;
  }
  if (
    fields.gitProvider === 'github' &&
    !tokenResult.ambiguous &&
    !tokenResult.scopes.includes('repo')
  ) {
    setWizardResult(getMessage('options_tokenValidMissingScope', [tokenResult.username]), 'error');
    return false;
  }
  wizardState.username = tokenResult.username;
  wizardState.tokenValidated = true;
  if (!onboardingWizardOwnerInput.value.trim()) onboardingWizardOwnerInput.value = tokenResult.username || '';
  setWizardResult(getMessage('options_onboardingWizardTokenValidated'), 'success');
  return true;
}

async function runWizardEnvironmentCheck() {
  if (!wizardState.tokenValidated) {
    setWizardResult(getMessage('options_onboardingWizardNeedConnection'), 'error');
    return false;
  }

  syncWizardFieldsToConnectionForm();
  await _saveSettings();

  const fields = getWizardConnectionFields();
  const basePath = onboardingWizardPathInput.value.trim() || 'bookmarks';
  if (!fields.owner || !fields.repo) {
    setWizardResult(getMessage('options_onboardingWizardRepoRequired'), 'error');
    return false;
  }
  if (!(await ensureWizardHostPermission(fields))) {
    return false;
  }

  if (onboardingWizardRepoFlowSelect.value === 'autoCreate') {
    const normalizedOwner = fields.owner.toLowerCase();
    const normalizedUser = String(wizardState.username || '').toLowerCase();
    if (!normalizedUser || normalizedOwner !== normalizedUser) {
      setWizardResult(
        `${getMessage('options_onboardingWizardRepoOwnerMismatch', [wizardState.username || ''])} ${getMessage('options_onboardingWizardRepoUserOnlyHint')}`,
        'error'
      );
      return false;
    }
    const createResp = await chrome.runtime.sendMessage({
      action: 'createRepository',
      token: fields.token,
      owner: fields.owner,
      repo: fields.repo,
      branch: fields.branch,
      gitProvider: fields.gitProvider,
      serverUrl: fields.serverUrl,
    });
    if (!createResp?.success && !String(createResp?.message || '').includes('name already exists')) {
      const message = createResp?.message || getMessage('options_onboardingWizardRepoCreateFailed');
      const denied = /permission|forbidden|denied|access/i.test(message);
      setWizardResult(
        denied ? getMessage('options_onboardingWizardRepoCreatePermissionDenied') : message,
        'error'
      );
      return false;
    }
  }

  const api = createConnectionApi(fields);
  const repoExists = await api.checkRepo();
  if (!repoExists) {
    setWizardResult(getMessage('options_tokenValidRepoNotFound', [wizardState.username || fields.owner, `${fields.owner}/${fields.repo}`]), 'error');
    return false;
  }

  const stopPathPulse = startProgressPulse([
    'Checking repository path',
    'Inspecting remote folder structure',
  ], 2500);
  let pathCheck;
  try {
    pathCheck = await checkPathSetup(api, basePath);
  } finally {
    stopPathPulse();
  }

  wizardState.repoRef = `${fields.owner}/${fields.repo}`;
  wizardState.pathStatus = pathCheck.status;
  wizardState.firstSyncDone = false;
  if (onboardingWizardRepoFlowSelect.value === 'autoCreate' && pathCheck.status !== 'hasBookmarks') {
    setWizardBusy(true, getMessage('popup_syncing'));
    try {
      await waitForRemoteBaseline(api);
      await initializePathAndRunFirstPush((payload) => {
        onboardingWizardHint.textContent = formatSyncProgress(payload);
      });
    } finally {
      setWizardBusy(false);
    }
    wizardState.firstSyncDone = true;
    setWizardResult(getMessage('options_onboardingInitPathSuccess', [basePath]), 'success');
  } else {
    setWizardResult(getMessage('options_onboardingWizardEnvironmentChecked'), 'success');
  }
  wizardState.environmentChecked = true;
  return true;
}

/**
 * Show animated progress messages while a long async operation runs.
 * Cycles through the provided messages with animated dots.
 * Returns a stop function — call it when done.
 * @param {string[]} messages - Ordered list of status messages to cycle through
 * @param {number} msPerStep - How long to show each message before advancing
 * @returns {() => void} stop function
 */
function startProgressPulse(messages, msPerStep = 3000) {
  let msgIndex = 0;
  let dotCount = 1;
  const intervalMs = 600;
  const startTime = Date.now();

  const tick = () => {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const dots = '.'.repeat(dotCount);
    onboardingWizardHint.textContent = `${messages[msgIndex]}${dots}`;
    onboardingWizardElapsed.textContent = elapsed > 0 ? `${elapsed}s` : '';
    dotCount = (dotCount % 3) + 1;
    if (Date.now() - phaseStart >= msPerStep && msgIndex < messages.length - 1) {
      msgIndex++;
      phaseStart = Date.now();
    }
  };

  let phaseStart = Date.now();
  tick();
  const id = setInterval(tick, intervalMs);
  return () => clearInterval(id);
}

async function runWizardSyncAction() {
  if (!wizardState.environmentChecked) {
    setWizardResult(getMessage('options_onboardingWizardNeedAction'), 'error');
    return false;
  }
  const fields = getWizardConnectionFields();
  const basePath = onboardingWizardPathInput.value.trim() || 'bookmarks';
  const api = createConnectionApi(fields);

  wizardStatusEl.style.display = 'flex';

  if (wizardState.pathStatus === 'hasBookmarks') {
    setWizardBusy(true, getMessage('popup_syncing'));
    try {
      const pullResult = await runSyncPortAction('pull', {}, (payload) => {
        onboardingWizardHint.textContent = formatSyncProgress(payload);
      });
      setWizardBusy(false);
      if (!pullResult?.success) {
        setWizardResult(pullResult?.message || 'Pull failed', 'error');
        return false;
      }
      setWizardResult(getMessage('options_onboardingPullSuccess'), 'success');
      wizardState.firstSyncDone = true;
      return true;
    } catch (err) {
      setWizardBusy(false);
      throw err;
    }
  }

  setWizardBusy(true, getMessage('popup_syncing'));

  let bookmarkCount = 0;
  let estSec = null;
  try {
    const tree = await chrome.bookmarks.getTree();
    const countNodes = (nodes) => nodes.reduce((n, node) =>
      n + (node.url ? 1 : 0) + (node.children ? countNodes(node.children) : 0), 0);
    bookmarkCount = countNodes(tree);
    estSec = Math.round(bookmarkCount / 5) + 5;
  } catch (_) { /* non-fatal */ }

  const syncStart = Date.now();
  try {
    await initializePathAndRunFirstPush((payload) => {
      onboardingWizardHint.textContent = formatSyncProgress(payload);
    });
    setWizardBusy(false);
    const actualSec = ((Date.now() - syncStart) / 1000).toFixed(1);
    console.log(
      `[GitSyncMarks] Onboarding sync done — bookmarks: ${bookmarkCount}, ` +
      `estimated: ${estSec != null ? estSec + 's' : 'n/a'}, actual: ${actualSec}s`
    );
    setWizardResult(getMessage('options_onboardingInitPathSuccess', [basePath]), 'success');
    wizardState.firstSyncDone = true;
    return true;
  } catch (err) {
    setWizardBusy(false);
    throw err;
  }
}

export function showValidation(message, type) {
  validationResult.textContent = message;
  validationResult.className = `validation-result ${type}`;
  validationSpinner.style.display = type === 'loading' ? 'inline-block' : 'none';
}

export function initWizard({ saveSettings }) {
  _saveSettings = saveSettings;

  renderProviderOptions(onboardingWizardGitProviderSelect, 'github');
  onboardingWizardGitProviderSelect?.addEventListener('change', updateWizardProviderUi);
  onboardingWizardGheEnabled?.addEventListener('change', updateWizardProviderUi);

  validateBtn.addEventListener('click', async () => {
    await validateAndInspectRepo({ offerInteractiveActions: true });
  });

  connectionPathInitBtn.addEventListener('click', async () => {
    const fields = getConnectionFormFieldsFromPage();
    const basePath = connectionPathInitGroup.dataset.path || filepathInput.value.trim() || 'bookmarks';
    if (!fields.token || !fields.owner || !fields.repo) {
      showValidation(getMessage('options_browseFolderNotConfigured'), 'error');
      return;
    }
    if (!(await ensureWizardHostPermission(fields))) {
      return;
    }

    connectionPathInitBtn.disabled = true;
    showValidation(getMessage('popup_syncing'), 'loading');
    try {
      const api = createConnectionApi(fields);
      const pathCheck = await checkPathSetup(api, basePath);
      if (pathCheck.status === 'hasBookmarks') {
        hideConnectionPathInitAction();
        showValidation(getMessage('options_onboardingInitPathAlreadyExists', [basePath]), 'success');
        return;
      }
      await initializePathAndRunFirstPush((payload) => {
        showValidation(formatSyncProgress(payload), 'loading');
      });
      hideConnectionPathInitAction();
      showValidation(getMessage('options_onboardingInitPathSuccess', [basePath]), 'success');
    } catch (err) {
      showValidation(getMessage('options_error', [err.message]), 'error');
    } finally {
      connectionPathInitBtn.disabled = false;
    }
  });

  onboardingWizardStartBtn.addEventListener('click', async () => {
    await startOnboardingWizard({ manual: true });
  });

  const helpWizardBtn = document.getElementById('help-wizard-btn');
  if (helpWizardBtn) {
    helpWizardBtn.addEventListener('click', async () => {
      await startOnboardingWizard({ manual: true });
    });
  }

  onboardingWizardBackBtn.addEventListener('click', () => {
    if (!wizardState.active) return;
    if (wizardState.stepIndex > 0) {
      wizardState.stepIndex -= 1;
      renderOnboardingWizardStep();
    }
  });

  onboardingWizardSkipBtn.addEventListener('click', async () => {
    if (!wizardState.active) return;
    await dismissOnboardingWizard();
  });

  onboardingWizardActionBtn.addEventListener('click', async () => {
    if (!wizardState.active) return;
    const stepKey = WIZARD_STEPS[wizardState.stepIndex];
    const shouldShowBusy = stepKey === 'tokenInput' || stepKey === 'environment';
    if (shouldShowBusy) {
      const loadingMsg = stepKey === 'environment'
        ? getMessage('options_onboardingWizardSyncInProgress')
        : getMessage('options_checking');
      setWizardBusy(true, loadingMsg);
    } else {
      onboardingWizardActionBtn.disabled = true;
    }
    try {
      if (stepKey === 'tokenInput') {
        await runWizardTokenValidation();
        return;
      }
      if (stepKey === 'environment') {
        if (!wizardState.environmentChecked) {
          await runWizardEnvironmentCheck();
        } else {
          await runWizardSyncAction();
        }
        return;
      }
    } catch (err) {
      setWizardResult(getMessage('options_error', [err.message]), 'error');
    } finally {
      if (shouldShowBusy) {
        setWizardBusy(false);
      } else {
        onboardingWizardActionBtn.disabled = false;
      }
    }
  });

  onboardingWizardNextBtn.addEventListener('click', async () => {
    if (!wizardState.active) return;
    const stepKey = WIZARD_STEPS[wizardState.stepIndex];
    const shouldShowBusy = stepKey === 'tokenInput' || stepKey === 'environment';
    if (shouldShowBusy) {
      const loadingMsg = stepKey === 'environment'
        ? getMessage('options_onboardingWizardSyncInProgress')
        : getMessage('options_checking');
      setWizardBusy(true, loadingMsg);
    } else {
      onboardingWizardNextBtn.disabled = true;
    }
    try {
      if (stepKey === 'hasToken' && onboardingWizardHasTokenSelect.value === 'no') {
        wizardState.stepIndex = WIZARD_STEPS.indexOf('tokenHelp');
        renderOnboardingWizardStep();
        return;
      }
      if (stepKey === 'tokenInput') {
        const ok = await runWizardTokenValidation();
        if (!ok) return;
      }
      if (stepKey === 'provider') {
        syncWizardProviderState();
        updateWizardProviderUi();
        const providerFields = getWizardConnectionFields();
        if (wizardServerUrlRequired(providerFields)) {
          setWizardResult(getMessage('options_serverUrlRequired'), 'error');
          return;
        }
        if (!(await ensureWizardHostPermission(providerFields))) {
          return;
        }
      }
      if (stepKey === 'repoDecision') {
        wizardState.repoFlow = onboardingWizardRepoFlowSelect.value;
      }
      if (stepKey === 'environment') {
        if (!wizardState.environmentChecked) {
          const checked = await runWizardEnvironmentCheck();
          if (!checked) return;
        }
        if (!wizardState.firstSyncDone) {
          const synced = await runWizardSyncAction();
          if (!synced) return;
        }
      }
      if (stepKey === 'finish') {
        await completeOnboardingWizard();
        showValidation(getMessage('options_onboardingWizardCompleted'), 'success');
        return;
      }
      wizardState.stepIndex = Math.min(wizardState.stepIndex + 1, WIZARD_STEPS.length - 1);
      renderOnboardingWizardStep();
    } catch (err) {
      setWizardResult(getMessage('options_error', [err.message]), 'error');
    } finally {
      if (shouldShowBusy) {
        setWizardBusy(false);
      } else {
        onboardingWizardNextBtn.disabled = false;
      }
    }
  });
}
