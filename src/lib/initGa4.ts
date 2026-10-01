import { initGa4 } from './ga4Runtime';
initGa4({
  "measurementId": "G-W0KL3P7KF6",
  "hosts": [
    "agilitymanager.se",
    "www.agilitymanager.se"
  ],
  "excluded": [
    "/admin",
    "/konto",
    "/mitt-agilitymanager",
    "/instruktor",
    "/traning",
    "/resultat",
    "/tavlingar/favoriter",
    "/elev"
  ],
  "consentKey": "agilitymanager_ga4_consent_v2"
});
