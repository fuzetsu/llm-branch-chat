/**
 * Downloads data as a file
 * @param data - Data to download (string or Blob)
 * @param filename - Name of the file to download
 * @param mimeType - MIME type of the file
 */
export function downloadFile(
  data: string | Blob,
  filename: string,
  mimeType: string = 'application/octet-stream',
) {
  let blob: Blob

  if (typeof data === 'string') {
    blob = new Blob([data], { type: mimeType })
  } else {
    blob = data
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Creates a file input for uploading files
 * @param callback - Function to call with the file content
 * @param accept - File types to accept (e.g., '.json')
 */
export function createFileInput(callback: (content: string) => void, accept: string = '*') {
  const fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.accept = accept
  fileInput.style.display = 'none'

  fileInput.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]

    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (content) {
        callback(content)
      }
    }

    reader.onerror = () => {
      throw new Error('Failed to read file')
    }

    reader.readAsText(file)
  })

  document.body.appendChild(fileInput)
  fileInput.click()
  document.body.removeChild(fileInput)
}

/**
 * Helper function specifically for JSON downloads
 * @param jsonData - JSON string to download
 * @param filename - Name of the file to download
 */
export function downloadJsonFile(jsonData: string, filename: string) {
  downloadFile(jsonData, filename, 'application/json')
}
