# Research log

Date: November 3, 2026 (user timezone).

## Available evidence

- User-supplied photo: physical wooden central hub with radial track/marker
  positions, ivory dominoes, and colored train markers. It informs the tactile
  tabletop direction, not an exact asset or layout to copy.
- User requirements and subsequent choices are recorded in `product.md`.
- Local repository initially contained only `README.md` at commit
  `57d58fbf1a016cb644bc7cadd76d56492f1b7ea3`. No application/rule implementation,
  package manifests, workflows, or tests existed to inspect.
- Read-only `git ls-remote origin HEAD` succeeded through the existing platform
  proxy outside the command sandbox. No extra GitHub token is required for reads.

## Requested reference and candidate rule sources

| Source | Purpose | Retrieval status |
| --- | --- | --- |
| https://mexicantrain.online/ | User's gameplay/layout reference | HTTPS proxy denied CONNECT with 403; page not inspected. |
| https://www.dominorules.com/mexican-train | Candidate published rules for comparison | HTTPS proxy denied CONNECT with 403; content and current URL not verified. |
| https://www.pagat.com/domino/line/mextrain.html | Candidate rules/variation reference | HTTPS proxy denied CONNECT with 403; content and current URL not verified. |

Do not cite these pages as support for a rule until they are actually retrieved.
Current rule proposals use general domain knowledge plus the user's confirmed
house rules, not newly verified web research. No reference screenshots, source
code, art, branding, or sound have been copied.

## Access change saved

Saved a confirmed configuration draft update adding only these custom domains:

```text
mexicantrain.online
www.dominorules.com
www.pagat.com
```

The existing package-manager/GitHub preset is preserved. The tool returned
`status: saved` and `requires_publish: true`. Draft saving does not change the
running proxy policy. Review and save the changes in environment settings, then
publish the environment to activate the configuration. No new secret is requested.
If a site redirects to an additional domain, inspect that result and add only the
necessary destination through the same workflow.

## Resume after configuration activation

1. Recheck environment status for current/enforced policy and required hosts.
2. Retry source reads through the inherited HTTPS proxy with TLS verification on.
3. Inspect the example's actual gameplay, lobby, board fitting, and responsive
   behavior if browsing is available. HTML alone cannot establish interaction feel.
4. Compare opening turns, doubles, draw/pass, community starts, blank scoring,
   and round endings across retrieved sources. Record quotations/sections only
   after verification, clearly separating house rules from source variants.
5. Update `rules.md` with verified references and remaining differences; ask only
   for household decisions that affect behavior. Never override a confirmed user
   preference because another rulebook differs.

External verification remains pending. It does not prevent the current product,
interaction, architecture, or visual planning, but must not be described as done.
