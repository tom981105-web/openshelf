# OpenShelf external scheduler

GitHub Actions scheduled events can be delayed or skipped. OpenShelf therefore uses Google Apps Script to dispatch the existing workflow.

## Setup

1. Create a new Google Apps Script project.
2. Paste the contents of `google-apps-script-trigger.gs`.
3. In **Project Settings → Script Properties**, add:
   - Key: `GITHUB_TOKEN`
   - Value: a GitHub token with Actions write access to `tom981105-web/openshelf`.
4. Run `setupOpenShelfTrigger()` once and approve permissions.
5. Optionally run `testOpenShelfDispatch()` once to verify the GitHub workflow starts.

The Apps Script checks every 5 minutes. From minute 0 onward it dispatches at most once per Seoul hour. The last successful dispatch hour is stored in Script Properties, preventing duplicate hourly runs.

GitHub's workflow keeps `workflow_dispatch`, so it can still be run manually from the Actions tab.
