# Path to the schoolDataset.ts file
$datasetFile = "F:\web-clients\joseph-sardella\jpsrealtor\src\app\constants\schoolDataset.ts"

# Read the dataset file
$content = Get-Content $datasetFile

# Iterate through the file and update photoUrl and logoUrl
$updatedContent = foreach ($line in $content) {
    if ($line -match 'slug: "([^"]+)"') {
        $slug = $matches[1]
        # Update photoUrl and logoUrl using the slug
        $line = $line -replace 'photoUrl: ""', "photoUrl: `"$slug`""
        $line = $line -replace 'logoUrl: ""', "logoUrl: `"$slug-logo`""
    }
    $line
}

# Write back the updated content
Set-Content -Path $datasetFile -Value $updatedContent

Write-Host "Slug-based photoUrl and logoUrl updated successfully!"
