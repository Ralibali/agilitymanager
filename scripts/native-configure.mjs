import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const { version, build } = JSON.parse(readFileSync('mobile.version.json', 'utf8'));
if (existsSync('ios/App/App')) copyFileSync('assets/PrivacyInfo.xcprivacy', 'ios/App/App/PrivacyInfo.xcprivacy');
if (!/^\d+\.\d+\.\d+$/.test(version) || !Number.isSafeInteger(build) || build < 1) throw new Error('Invalid mobile version/build');
const update = (file, transform) => {
  if (existsSync(file)) writeFileSync(file, transform(readFileSync(file, 'utf8')));
};
update('android/app/build.gradle', text => text.replace(/versionCode \d+/, `versionCode ${build}`).replace(/versionName "[^"]+"/, `versionName "${version}"`));
update('android/app/src/main/AndroidManifest.xml', text => {
  text = text.replace('android:allowBackup="true"', 'android:allowBackup="false"');
  if (!text.includes('android:usesCleartextTraffic')) text = text.replace('<application', '<application android:usesCleartextTraffic="false"');
  text = text.replace(/\s*<uses-permission android:name="android\.permission\.ACCESS_(?:COARSE|FINE)_LOCATION"\s*\/>/g, '');
  if (!text.includes('android:scheme="agilitymanager"')) text = text.replace('</activity>', `    <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="agilitymanager" />
            </intent-filter>
        </activity>`);
  return text;
});
update('ios/App/App/Info.plist', text => {
  text = text.replace(/<key>CFBundleDevelopmentRegion<\/key>\s*<string>[^<]+<\/string>/, '<key>CFBundleDevelopmentRegion</key><string>sv</string>');
  text = text.replace(/\s*<key>NSLocationWhenInUseUsageDescription<\/key>\s*<string>[^<]*<\/string>/g, '');
  const keys = [
    ['ITSAppUsesNonExemptEncryption', '<false/>'],
    ['CFBundleURLTypes', '<array><dict><key>CFBundleURLSchemes</key><array><string>agilitymanager</string></array></dict></array>'],
  ];
  for (const [key, value] of keys) if (!text.includes(`<key>${key}</key>`)) text = text.replace(/<\/dict>\s*<\/plist>/, `<key>${key}</key>${value}\n</dict>\n</plist>`);
  return text;
});
update('ios/App/App.xcodeproj/project.pbxproj', text => {
  text = text.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${build};`)
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
    .replace(/IPHONEOS_DEPLOYMENT_TARGET = [^;]+;/g, 'IPHONEOS_DEPLOYMENT_TARGET = 15.0;')
    .replace(/CODE_SIGN_STYLE = Automatic;(?:\s*DEVELOPMENT_TEAM = [^;]*;)?/g, 'CODE_SIGN_STYLE = Automatic;\n\t\t\t\tDEVELOPMENT_TEAM = 9G8SUZKS7Y;');
  if (!text.includes('PrivacyInfo.xcprivacy')) {
    text = text.replace('/* Begin PBXBuildFile section */', '/* Begin PBXBuildFile section */\n\t\tA681D1143D1A405DA3429001 /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = A681D1143D1A405DA3429002 /* PrivacyInfo.xcprivacy */; };');
    text = text.replace('/* Begin PBXFileReference section */', '/* Begin PBXFileReference section */\n\t\tA681D1143D1A405DA3429002 /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };');
    text = text.replace('504EC3131FED79650016851F /* Info.plist */,', '504EC3131FED79650016851F /* Info.plist */,\n\t\t\t\tA681D1143D1A405DA3429002 /* PrivacyInfo.xcprivacy */,');
    text = text.replace('504EC30F1FED79650016851F /* Assets.xcassets in Resources */,', '504EC30F1FED79650016851F /* Assets.xcassets in Resources */,\n\t\t\t\tA681D1143D1A405DA3429001 /* PrivacyInfo.xcprivacy in Resources */,');
  }
  return text;
});
console.log(`Configured AgilityManager ${version} (${build}); Android API 36 / iOS 15.`);
