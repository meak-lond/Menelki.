# Mise en place du domaine menelki.com

Statut : préparé le 2026-11-02, **rien n'est actif tant que le domaine n'est pas acheté et que la PR « domaine » n'est pas fusionnée**.

## Ordre à respecter
1. Vérifier que `menelki.com` est libre et l'acheter chez un registrar (environ 10 à 15 dollars par an ; active le renouvellement automatique et la protection des données WHOIS si elle est offerte). Le titulaire doit être toi : garde l'accès au compte.
2. Configurer le DNS chez le registrar (étape suivante).
3. Dans GitHub : dépôt → Settings → Pages → Custom domain : `menelki.com`, enregistrer. Attendre la vérification DNS (quelques minutes à quelques heures), puis cocher **Enforce HTTPS**.
4. Fusionner la PR « domaine » (fichier `CNAME` + 3 adresses dans `index.html`). Ne la fusionner qu'après l'étape 3, sinon les aperçus de partage pointeraient vers un site pas encore prêt.
5. Mettre à jour les services (voir plus bas).

## Enregistrements DNS à créer
| Type | Nom | Valeur |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |
| CNAME | `www` | `meak-lond.github.io` |

À re-vérifier dans la documentation GitHub Pages (« Managing a custom domain ») au moment de la configuration, ces adresses pouvant évoluer. Supprime tout autre enregistrement A ou AAAA existant sur `@` (page de parking du registrar). Ne mets pas de caractère générique `*`.

## Après la mise en ligne
- **Supabase** (Authentication → URL Configuration, réglage de production à valider par le propriétaire) : mettre `https://menelki.com` comme Site URL et l'ajouter aux Redirect URLs. Garder l'ancienne adresse quelques jours.
- **Google Cloud** (Identifiants → client OAuth) : ajouter `https://menelki.com` aux origines JavaScript autorisées. L'URI de redirection reste celle de Supabase.
- **Réglages de l'administration** : ouvrir `https://menelki.com/admin.html` et réenregistrer les e-mails d'alerte, pour que le lien dans les e-mails pointe vers le nouveau domaine. Réinstaller l'application sur l'iPhone depuis la nouvelle adresse (l'ancienne installation reste liée à l'ancien domaine).
- **E-mails** : une fois le domaine vérifié dans Resend (enregistrements DNS fournis par Resend), l'expéditeur pourra devenir `MENELKI <contact@menelki.com>`, ce qui permettra aussi les e-mails de confirmation aux clients. Pour recevoir du courrier à cette adresse sans frais, un service de redirection d'e-mails du registrar ou de Cloudflare convient.
- Mettre à jour `CONTACT_EMAIL` dans `config.js`, les mentions légales et les réseaux sociaux.

## Retour arrière
Supprimer le fichier `CNAME` et le champ Custom domain dans Settings → Pages ramène le site à `https://meak-lond.github.io/Menelki./`.
