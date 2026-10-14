$ErrorActionPreference = 'Stop'

$reference = 'C:\Users\chlom\.codex\plugins\cache\openai-curated-remote\openai-templates\0.1.1\skills\artifact-template-project-kickoff\assets\reference.pptx'
$draft = Join-Path (Resolve-Path '.tmp\newsletter-kickoff').Path 'newsletter-sans-erreur-draft.pptx'
if (Test-Path -LiteralPath $draft) { Remove-Item -LiteralPath $draft -Force }

function Add-TextShape($shape, $items) {
  if ($shape.Type -eq 6) {
    for ($i = 1; $i -le $shape.GroupItems.Count; $i++) {
      Add-TextShape $shape.GroupItems.Item($i) $items
    }
  } elseif ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1) {
    $items.Add($shape)
  }
}

function Get-TextShapes($shapeCollection) {
  $items = New-Object System.Collections.Generic.List[object]
  for ($i = 1; $i -le $shapeCollection.Count; $i++) {
    Add-TextShape $shapeCollection.Item($i) $items
  }
  return $items
}

function Get-AllTextShapes($slide) {
  $items = New-Object System.Collections.Generic.List[object]
  foreach ($shape in (Get-TextShapes $slide.Shapes)) { $items.Add($shape) }
  foreach ($shape in (Get-TextShapes $slide.CustomLayout.Shapes)) { $items.Add($shape) }
  return $items
}

function Set-ExactText($slide, [string]$oldText, [string[]]$newTexts) {
  $index = 0
  $needle = $oldText.Replace('`v', [string][char]11).Replace('`r', "`r")
  foreach ($shape in (Get-AllTextShapes $slide)) {
    $current = $shape.TextFrame.TextRange.Text.Trim()
    if ($current -eq $needle -and $index -lt $newTexts.Count) {
      $replacement = $newTexts[$index].Replace('`v', [string][char]11).Replace('`r', "`r")
      $shape.TextFrame.TextRange.Text = $replacement
      $shape.TextFrame.WordWrap = -1
      $index++
    }
  }
  if ($index -ne $newTexts.Count) {
    foreach ($debugShape in (Get-AllTextShapes $slide)) {
      Write-Output ("DEBUG[{0}] {1}" -f $debugShape.Name, ($debugShape.TextFrame.TextRange.Text -replace "`r|`n|`v", ' / '))
    }
    throw "Texte '$oldText': $index remplacement(s) sur $($newTexts.Count) attendu(s), diapositive $($slide.SlideIndex)."
  }
}

function Set-PageNumber($slide, [int]$number) {
  foreach ($shape in (Get-TextShapes $slide.Shapes)) {
    if ($shape.Left -gt 850 -and $shape.Top -gt 480 -and $shape.Width -lt 80 -and $shape.Height -lt 45) {
      $shape.TextFrame.TextRange.Text = [string]$number
    }
  }
}

$ppt = New-Object -ComObject PowerPoint.Application
try {
  $presentation = $ppt.Presentations.Open($reference, 0, 0, 0)
  try {
    foreach ($index in @(11, 10, 9, 6, 3, 2)) { $presentation.Slides.Item($index).Delete() }

    $s = $presentation.Slides.Item(1)
    Set-ExactText $s 'Team Project `vKickoff Session' @('Newsletter sans erreur`vComposition adaptative')
    Set-ExactText $s 'Aligning on the vision, plan, and path to success' @('Une composition qui aboutit dans toutes les situations')
    Set-ExactText $s '2026 H2 Planning' @('Plan de mise en œuvre')
    $s.Shapes.Item('Title 3').Top = 135
    $s.Shapes.Item('Title 3').Height = 230
    $s.Shapes.Item('Title 3').TextFrame.TextRange.Font.Size = 50

    $s = $presentation.Slides.Item(2)
    Set-ExactText $s 'Large message slides with three callouts. Lorem ipsum dolor sit amet, consectetur adipiscing elit.' @('Le moteur doit toujours produire un document exploitable, quelle que soit la quantité de contenu')
    Set-ExactText $s 'Supertitle' @('GARANTIE', 'COMPOSITION', 'EXPÉRIENCE')
    Set-ExactText $s 'Title here`rLorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque ultricies quam ut massa luctus cursus. Nullam pharetra mauris tortor. In hac habitasse platea dictumst.' @(
      "Aucun blocage`rL’aperçu et le PDF restent disponibles. Le moteur ne lance plus d’erreur liée au dépassement de page.",
      'Retour clair`rUne indication non bloquante explique les adaptations appliquées au document.',
      'Aucune perte`rLe texte et les images restent présents. La mise en page change avant que le contenu soit réduit.'
    )

    $s = $presentation.Slides.Item(3)
    Set-ExactText $s 'Four points grid layout' @('Stratégie de repli en quatre niveaux')
    Set-ExactText $s 'Title goes here`rLorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque ultricies quam ut massa luctus cursus.' @(
      '1. Rééquilibrage`rDéplacer les rubriques entre recto et verso selon la place réellement mesurée.',
      '2. Réduction contrôlée`rRéduire les espacements et les images avant de toucher à la taille du texte.',
      '3. Pagination`rAjouter automatiquement une page dès que deux pages ne suffisent plus.',
      '4. Mode de secours`rUtiliser une composition simple en une colonne si le moteur avancé échoue.'
    )
    foreach ($shape in $s.Shapes) {
      if ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1 -and $shape.TextFrame.TextRange.Text -match '^[1-4]\. ') {
        $shape.TextFrame.TextRange.Font.Size = 22
      }
    }

    $s = $presentation.Slides.Item(4)
    Set-ExactText $s 'Intro with four topics' @('Règles de composition')
    Set-ExactText $s 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque ultricies quam ut massa luctus cursus.' @('Le moteur mesure le contenu réel dans le navigateur et choisit la première composition lisible qui contient toutes les informations.')
    Set-ExactText $s 'Item or topic `vtitle goes here' @('Photos et visuels', 'Texte et rubriques', 'Nombre de pages', 'Dernier recours')
    Set-ExactText $s 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque ultricies quam ut massa luctus.' @(
      'Conserver le ratio, réduire la hauteur, puis déplacer les visuels vers une page suivante.',
      'Garder les blocs entiers si possible. Autoriser leur découpage propre entre deux pages.',
      'Passer de 1 à 2 pages, puis continuer automatiquement sans limite fixe.',
      'Générer un document minimal lisible et signaler discrètement la simplification.'
    )

    $s = $presentation.Slides.Item(5)
    Set-ExactText $s 'Timeline with three text only milestones' @('Parcours de composition')
    Set-ExactText $s 'Date' @('ÉTAPE 1', 'ÉTAPE 2', 'ÉTAPE 3')
    Set-ExactText $s 'Title here`rLorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque ultricies quam.' @(
      'Adaptation`rTester les variantes du plus fidèle au plus compact.',
      'Mesure`rCalculer la hauteur de chaque bloc, image et zone fixe.',
      "Livraison`rRendre l’aperçu et le PDF, avec un résumé des ajustements."
    )

    $s = $presentation.Slides.Item(6)
    Set-ExactText $s 'Team Project `vKickoff Session' @('Décision proposée`vNewsletter sans erreur')
    Set-ExactText $s 'Thank you!' @('Lancer la refonte du moteur de composition')
    Set-ExactText $s '2026 H2 Planning' @('Prêt pour implémentation')
    $s.Shapes.Item('Title 3').Top = 135
    $s.Shapes.Item('Title 3').Height = 230
    $s.Shapes.Item('Title 3').TextFrame.TextRange.Font.Size = 50
    $s.Shapes.Item('Rounded Rectangle 2').Top = 82
    $s.Shapes.Item('Rounded Rectangle 2').Height = 46
    $s.Shapes.Item('Rounded Rectangle 2').TextFrame.TextRange.Font.Size = 14

    for ($i = 2; $i -le $presentation.Slides.Count; $i++) { Set-PageNumber $presentation.Slides.Item($i) $i }

    foreach ($slide in $presentation.Slides) {
      foreach ($shape in (Get-AllTextShapes $slide)) {
        $shape.TextFrame.WordWrap = -1
        if ($shape.TextFrame2.TextRange.Text.Length -gt 0) { $shape.TextFrame2.AutoSize = 2 }
      }
    }

    $presentation.SaveAs($draft, 24)
  } finally {
    $presentation.Close()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($presentation)
  }
} finally {
  $ppt.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt)
}

Write-Output $draft
