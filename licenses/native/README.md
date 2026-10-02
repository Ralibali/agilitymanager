# Native distribution notices

`scripts/native-notices.ts` emits a deterministic `THIRD_PARTY_NOTICES.txt` and
package manifest into every native web build. It uses the license/notice files
of the package versions actually rendered by Rollup, plus the native Capacitor
runtimes, the locked Swift packages, Cordova compatibility code and local fonts.
Vite copies these files into both platforms when `native:prepare` runs. No app
screen, network request or runtime behavior is changed.

The checked-in texts cover npm packages whose published tarballs omit a license,
and Swift/Apache runtime notices that Rollup cannot discover. `sources.json`
records upstream URLs and SHA-256 hashes. Builds do not fetch licenses online.
Fallback npm versions and Swift revisions are pinned in the emitter so upgrades
cannot silently reuse an unreviewed fallback.

Radix and React Three Fiber texts come from their npm publication commits.
The npm `react-remove-scroll-bar@2.3.8` metadata declares MIT and Anton Korzunov,
but its published gitHead is unavailable in the declared repository. Its MIT
text is therefore preserved from the canonical upstream repository at commit
`8ca9ba5ea52de03308fe8ced94f7b159a44d28ff` (the tree identifies itself as 2.3.7),
with its original 2025 copyright. This is a documented upstream-license fallback,
not an assertion that the two package sources are identical.

Apache Cordova's original LICENSE and NOTICE are preserved conservatively from
the upstream 8.0.0 distribution. Capacitor's Cordova source retains the ASF
Apache-2.0 headers. The generated notices include the complete upstream text,
including its additional third-party notices.

`android-runtime.json` records the 56 resolved Android release dependencies and
their POM license declarations. `android-runtime-LICENSES.txt` preserves all ten
license payloads found in those runtime AARs (deduplicated by exact text), plus
Ionic Filesystem's MIT text from its exact 1.1.0 upstream tag. Guava's license is
inherited from its declared `guava-parent:26.0-android` POM. The native dependency
input hashes make the build fail for review when Gradle dependency definitions
change. Build numbers do not affect these inputs. Empty archive license entries
are not treated as proof that no license applies.

The font license files also remain in `fonts/` as originally packaged. The course
templates are described in their source as AgilityManager originals, not copied
judge maps. This packaging check is not proof of ownership of arbitrary future
assets or content; such additions need their own provenance and license review.
