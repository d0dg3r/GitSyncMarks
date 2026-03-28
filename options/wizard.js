/**
 * Options Page – Onboarding Wizard
 * Full wizard flow: token help, validation, repo setup, environment check, first sync.
 */

import { getMessage } from '../lib/i18n.js';
import { GitHubAPI } from '../lib/github-api.js';
import { checkPathSetup, waitForRemoteBaseline } from '../lib/onboarding.js';

let _saveSettings = null;
let _loadSettings = null;

const validationSpinner = document.getElementById('validation-spinner');
const validationResult = document.getElementById('validation-result');
const tokenInput = document.getElementById('token');
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
const onboardingWizardTokenHelp = document.getElementById('onboarding-wizard-token-help');
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

export const WIZARD_STEPS = ['welcome', 'tokenHelp', 'hasToken', 'tokenInput', 'repoDecision', 'repoDetails', 'environment', 'finish'];
export const wizardState = {
  active: false,
  stepIndex: 0,
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

function wizardStepText(stepKey) {
  switch (stepKey) {
    case 'welcome':
      return {
        title: getMessage('options_onboardingWizardStepWelcomeTitle'),
        text: getMessage('options_onboardingWizardStepWelcomeText'),
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

async function initializePathAndRunFirstPush() {
  try {
    const result = await chrome.runtime.sendMessage({ action: 'bootstrapFirstSync' });
    if (result?.success) return;
    throw new Error(result?.message || 'Push failed');
  } catch (err) {
    throw err;
  }
}

async function validateAndInspectRepo({ offerInteractiveActions = true } = {}) {
  await _saveSettings();
  const token = tokenInput.value.trim();
  const owner = ownerInput.value.trim();
  const repo = repoInput.value.trim();
  const branch = branchInput.value.trim() || 'main';

  if (!token) {
    showValidation(getMessage('options_pleaseEnterToken'), 'error');
    return { ok: false };
  }

  showValidation(getMessage('options_checking'), 'loading');

  try {
    const api = new GitHubAPI(token, owner, repo, branch);

    const tokenResult = await api.validateToken();
    if (!tokenResult.valid) {
      showValidation(getMessage('options_invalidToken'), 'error');
      return { ok: false };
    }

    if (!tokenResult.ambiguous && !tokenResult.scopes.includes('repo')) {
      hideConnectionPathInitAction();
      showValidation(getMessage('options_tokenValidMissingScope', [tokenResult.username]), 'error');
      return { ok: false };
    }

    if (owner && repo) {
      const repoExists = await api.checkRepo();
      if (!repoExists) {
        hideConnectionPathInitAction();
        showValidation(getMessage('options_tokenValidRepoNotFound', [tokenResult.username, `${owner}/${repo}`]), 'error');
        return { ok: false };
      }
      const basePath = filepathInput.value.trim() || 'bookmarks';
      const pathCheck = await checkPathSetup(api, basePath);
      if (offerInteractiveActions && (pathCheck.status === 'unreachable' || pathCheck.status === 'empty')) {
        showConnectionPathInitAction(basePath);
        showValidation(getMessage('options_connectionOk', [tokenResult.username, `${owner}/${repo}`]), 'success');
        return {
          ok: true,
          username: tokenResult.username,
          repoRef: `${owner}/${repo}`,
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
            await chrome.runtime.sendMessage({ action: 'pull' });
            showValidation(getMessage('options_onboardingPullSuccess'), 'success');
          } catch (pullErr) {
            showValidation(getMessage('options_error', [pullErr.message]), 'error');
          }
        } else {
          showValidation(getMessage('options_connectionOk', [tokenResult.username, `${owner}/${repo}`]), 'success');
        }
        return;
      }
      showValidation(getMessage('options_connectionOk', [tokenResult.username, `${owner}/${repo}`]), 'success');
      return {
        ok: true,
        username: tokenResult.username,
        repoRef: `${owner}/${repo}`,
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

function syncWizardFieldsToConnectionForm() {
  tokenInput.value = onboardingWizardTokenInput.value.trim();
  ownerInput.value = onboardingWizardOwnerInput.value.trim();
  repoInput.value = onboardingWizardRepoInput.value.trim();
  branchInput.value = onboardingWizardBranchInput.value.trim() || 'main';
  filepathInput.value = onboardingWizardPathInput.value.trim() || 'bookmarks';
}

async function runWizardTokenValidation() {
  onboardingWizardResult.textContent = '';
  const token = onboardingWizardTokenInput.value.trim();
  if (!token) {
    setWizardResult(getMessage('options_pleaseEnterToken'), 'error');
    return false;
  }
  const api = new GitHubAPI(token, 'x', 'x', 'main');
  const tokenResult = await api.validateToken();
  if (!tokenResult.valid) {
    setWizardResult(getMessage('options_invalidToken'), 'error');
    return false;
  }
  if (!tokenResult.ambiguous && !tokenResult.scopes.includes('repo')) {
    setWizardResult(getMessage('options_tokenValidMissingScope', [tokenResult.username]), 'error');
    return false;
  }
  wizardState.username = tokenResult.username;
  wizardState.tokenValidated = true;
  if (!onboardingWizardOwnerInput.value.trim()) onboardingWizardOwnerInput.value = tokenResult.username;
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

  const token = onboardingWizardTokenInput.value.trim();
  const owner = onboardingWizardOwnerInput.value.trim();
  const repo = onboardingWizardRepoInput.value.trim();
  const branch = onboardingWizardBranchInput.value.trim() || 'main';
  const basePath = onboardingWizardPathInput.value.trim() || 'bookmarks';
  if (!owner || !repo) {
    setWizardResult(getMessage('options_onboardingWizardRepoRequired'), 'error');
    return false;
  }

  if (onboardingWizardRepoFlowSelect.value === 'autoCreate') {
    const normalizedOwner = owner.toLowerCase();
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
      token,
      owner,
      repo,
      branch,
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

  const api = new GitHubAPI(token, owner, repo, branch);
  const repoExists = await api.checkRepo();
  if (!repoExists) {
    setWizardResult(getMessage('options_tokenValidRepoNotFound', [wizardState.username || owner, `${owner}/${repo}`]), 'error');
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

  wizardState.repoRef = `${owner}/${repo}`;
  wizardState.pathStatus = pathCheck.status;
  wizardState.firstSyncDone = false;
  if (onboardingWizardRepoFlowSelect.value === 'autoCreate' && pathCheck.status !== 'hasBookmarks') {
    const stopInitPulse = startProgressPulse([
      'Waiting for repository to be ready',
      'Setting up initial folder structure',
      'Uploading bookmarks to GitHub',
      'Creating first commit',
    ]);
    try {
      await waitForRemoteBaseline(api);
      await initializePathAndRunFirstPush();
    } finally {
      stopInitPulse();
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
  const token = onboardingWizardTokenInput.value.trim();
  const owner = onboardingWizardOwnerInput.value.trim();
  const repo = onboardingWizardRepoInput.value.trim();
  const branch = onboardingWizardBranchInput.value.trim() || 'main';
  const basePath = onboardingWizardPathInput.value.trim() || 'bookmarks';
  const api = new GitHubAPI(token, owner, repo, branch);

  wizardStatusEl.style.display = 'flex';

  if (wizardState.pathStatus === 'hasBookmarks') {
    const stopPulse = startProgressPulse([
      getMessage('options_onboardingWizardPhaseDownloading') || 'Downloading bookmarks',
      getMessage('options_onboardingWizardPhaseApplying') || 'Applying bookmarks to browser',
      getMessage('options_onboardingWizardPhaseSaving') || 'Saving sync state',
    ]);
    try {
      const pullResult = await chrome.runtime.sendMessage({ action: 'pull' });
      stopPulse();
      if (!pullResult?.success) {
        setWizardResult(pullResult?.message || 'Pull failed', 'error');
        return false;
      }
      setWizardResult(getMessage('options_onboardingPullSuccess'), 'success');
      wizardState.firstSyncDone = true;
      return true;
    } catch (err) {
      stopPulse();
      throw err;
    }
  }

  const stopPulse = startProgressPulse([
    getMessage('options_onboardingWizardPhasePreparing') || 'Preparing bookmark data',
    getMessage('options_onboardingWizardPhaseUploading') || 'Uploading bookmarks to GitHub',
    getMessage('options_onboardingWizardPhaseCommit') || 'Creating repository commit',
    getMessage('options_onboardingWizardPhaseSaving') || 'Saving sync state',
  ]);

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
    await initializePathAndRunFirstPush();
    stopPulse();
    const actualSec = ((Date.now() - syncStart) / 1000).toFixed(1);
    console.log(
      `[GitSyncMarks] Onboarding sync done — bookmarks: ${bookmarkCount}, ` +
      `estimated: ${estSec != null ? estSec + 's' : 'n/a'}, actual: ${actualSec}s`
    );
    setWizardResult(getMessage('options_onboardingInitPathSuccess', [basePath]), 'success');
    wizardState.firstSyncDone = true;
    return true;
  } catch (err) {
    stopPulse();
    throw err;
  }
}

export function showValidation(message, type) {
  validationResult.textContent = message;
  validationResult.className = `validation-result ${type}`;
  validationSpinner.style.display = type === 'loading' ? 'inline-block' : 'none';
}

export function initWizard({ saveSettings, loadSettings }) {
  _saveSettings = saveSettings;
  _loadSettings = loadSettings;

  validateBtn.addEventListener('click', async () => {
    await validateAndInspectRepo({ offerInteractiveActions: true });
  });

  connectionPathInitBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    const owner = ownerInput.value.trim();
    const repo = repoInput.value.trim();
    const branch = branchInput.value.trim() || 'main';
    const basePath = connectionPathInitGroup.dataset.path || filepathInput.value.trim() || 'bookmarks';
    if (!token || !owner || !repo) {
      showValidation(getMessage('options_browseFolderNotConfigured'), 'error');
      return;
    }

    connectionPathInitBtn.disabled = true;
    showValidation(getMessage('options_checking'), 'loading');
    try {
      const api = new GitHubAPI(token, owner, repo, branch);
      const pathCheck = await checkPathSetup(api, basePath);
      if (pathCheck.status === 'hasBookmarks') {
        hideConnectionPathInitAction();
        showValidation(getMessage('options_onboardingInitPathAlreadyExists', [basePath]), 'success');
        return;
      }
      await _saveSettings();
      await initializePathAndRunFirstPush();
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
