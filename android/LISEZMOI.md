# Application Android MENELKI

L'application affiche le site (https://meak-lond.github.io/Menelki./) dans une « Trusted Web Activity » :
une modification du site apparaît donc dans l'application sans nouvelle version.

## Compiler
Sur GitHub : onglet **Actions → Application Android → dernier passage → Artifacts**.
- `menelki-test-apk` : application de test, à installer sur un téléphone Android.
- `menelki-google-play-aab` : paquet à envoyer sur Google Play (signé seulement si les secrets existent).

## Signature (à faire avec le compte Google Play)
Secrets GitHub à créer : `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
Ne jamais mettre la clé (.jks) ni ses mots de passe dans le dépôt.

## Barre d'adresse cachée (liens d'actifs numériques)
Le fichier `store/assetlinks.exemple.json`, une fois l'empreinte SHA-256 de Google Play ajoutée, doit être publié à
`https://meak-lond.github.io/.well-known/assetlinks.json`. Cela demande un dépôt nommé `meak-lond.github.io`
(avec un fichier `.nojekyll`) ou un nom de domaine à soi. Sans cela, l'application marche mais affiche une barre d'adresse.

## Réglages
Identifiant de l'application : `ci.menelki.app` (modifiable tant que rien n'est envoyé sur Google Play).
Version : `versionName` dans `app/build.gradle` ; le `versionCode` suit le numéro de passage GitHub.
