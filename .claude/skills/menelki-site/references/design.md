# Design MENELKI

- Style : mélange Apple (épuré) et Temu (dense, produits visibles), formes arrondies.
- Palette : noir profond, `#100906`, `#261D16`, `#2e0d18`, `#611927` (bordeaux), `#886C5F`, `#b87a3c` (cuivre), `#f9e7d4` (crème).
- Fond du site : page crème avec zones sombres (en-tête, hero, pied de page, barre du bas). Les barres fixes sont opaques, jamais transparentes.
- Polices : Inter, Space Grotesk, Montserrat.
- Logo : symbole « Éclat » (étoile + orbite), versions blanc et noir en SVG.
- Contrastes : toujours vérifier la lisibilité du texte sur fond crème et sur fond sombre.
- Liquid glass : fonds translucides (opacité 34 à 70 %) + `backdrop-filter: blur(28px) saturate(190%)` + liseré blanc et reflet intérieur. Le verre a besoin d'un fond coloré derrière (dégradés cuivre/bordeaux). Toujours prévoir le repli `prefers-reduced-transparency` avec des fonds pleins.
- Barre du bas (site et admin) : capsule flottante arrondie ; garder de la marge sous le contenu.
- Admin : même palette, avec la navigation du bas sur iPhone.
