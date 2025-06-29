import type { AppSettings, ConfirmModalOptions, Theme } from '../types/index.js'
import type { AppState } from '../state/AppState.js'
import { getElementById } from '../utils/index.js'

export class SettingsManager {
  constructor(private readonly appState: AppState) {}

  public showSettingsModal(): void {
    const modal = getElementById('settingsModal')

    // Populate form with current settings
    this.populateSettingsForm()
    modal.classList.remove('hidden')
    
    // Trigger transition
    setTimeout(() => {
      modal.classList.remove('opacity-0')
      modal.classList.add('opacity-100')
    }, 10)
  }

  private populateSettingsForm(): void {
    const settings = this.appState.settings

    getElementById<HTMLInputElement>('apiBaseUrl').value = settings.api.baseUrl
    getElementById<HTMLInputElement>('apiKey').value = settings.api.apiKey
    getElementById<HTMLTextAreaElement>('availableModels').value =
      settings.api.availableModels.join('\n')
    getElementById<HTMLInputElement>('temperature').value = settings.chat.temperature.toString()
    getElementById('temperatureValue').textContent = settings.chat.temperature.toString()
    getElementById<HTMLInputElement>('maxTokens').value = settings.chat.maxTokens.toString()
    getElementById<HTMLInputElement>('autoGenerateTitle').checked = settings.autoGenerateTitle
    getElementById<HTMLInputElement>('titleGenerationTrigger').value =
      settings.titleGenerationTrigger.toString()
    getElementById<HTMLSelectElement>('theme').value = settings.theme

    // Update model dropdowns
    this.updateModelDropdowns()
    getElementById<HTMLSelectElement>('defaultModel').value = settings.chat.model
    getElementById<HTMLSelectElement>('titleModel').value = settings.titleModel
  }

  public hideSettingsModal(): void {
    const modal = getElementById('settingsModal')
    modal.classList.remove('opacity-100')
    modal.classList.add('opacity-0')
    
    // Hide after transition
    setTimeout(() => {
      modal.classList.add('hidden')
    }, 300)
  }

  private updateModelDropdowns(): void {
    this.updateModelDropdown()
    this.updateTitleModelDropdown()
  }

  private updateModelDropdown(): void {
    const select = getElementById<HTMLSelectElement>('defaultModel')
    const availableModels = this.getAvailableModelsFromForm()

    this.populateModelSelect(select, availableModels)
  }

  private updateTitleModelDropdown(): void {
    const select = getElementById<HTMLSelectElement>('titleModel')
    const availableModels = this.getAvailableModelsFromForm()

    this.populateModelSelect(select, availableModels)
  }

  private getAvailableModelsFromForm(): string[] {
    return getElementById<HTMLTextAreaElement>('availableModels')
      .value.split('\n')
      .map((m) => m.trim())
      .filter((m) => m)
  }

  private populateModelSelect(select: HTMLSelectElement, models: string[]): void {
    select.innerHTML = '<option value="">Select a model</option>'
    models.forEach((model) => {
      const option = document.createElement('option')
      option.value = model
      option.textContent = model
      select.appendChild(option)
    })
  }

  public saveSettings(): void {
    try {
      const newSettings = this.collectSettingsFromForm()
      this.validateSettings(newSettings)

      this.appState.updateSettings(newSettings)
      this.applyTheme()
      this.hideSettingsModal()
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message)
      }
    }
  }

  private collectSettingsFromForm(): AppSettings {
    return {
      ...this.appState.settings,
      autoGenerateTitle: getElementById<HTMLInputElement>('autoGenerateTitle').checked,
      titleGenerationTrigger: parseInt(
        getElementById<HTMLInputElement>('titleGenerationTrigger').value,
      ),
      titleModel: getElementById<HTMLSelectElement>('titleModel').value,
      api: {
        baseUrl: getElementById<HTMLInputElement>('apiBaseUrl').value.trim(),
        apiKey: getElementById<HTMLInputElement>('apiKey').value.trim(),
        availableModels: this.getAvailableModelsFromForm(),
      },
      chat: {
        ...this.appState.settings.chat,
        model: getElementById<HTMLSelectElement>('defaultModel').value,
        temperature: parseFloat(getElementById<HTMLInputElement>('temperature').value),
        maxTokens: parseInt(getElementById<HTMLInputElement>('maxTokens').value),
      },
      theme: getElementById<HTMLSelectElement>('theme').value as Theme,
    }
  }

  private validateSettings(settings: AppSettings): void {
    if (!settings.api.baseUrl) {
      throw new Error('API Base URL is required')
    }
    if (!settings.api.apiKey) {
      throw new Error('API Key is required')
    }
    if (!settings.chat.model) {
      throw new Error('Please select a default model')
    }
    if (settings.autoGenerateTitle && !settings.titleModel) {
      throw new Error('Please select a title generation model or disable auto-generate titles')
    }
  }

  public showConfirmModal(options: ConfirmModalOptions): void {
    getElementById('confirmTitle').textContent = options.title
    getElementById('confirmMessage').textContent = options.message
    const modal = getElementById('confirmModal')
    modal.classList.remove('hidden')
    
    // Trigger transition
    setTimeout(() => {
      modal.classList.remove('opacity-0')
      modal.classList.add('opacity-100')
    }, 10)

    const confirmBtn = getElementById('confirmAction')
    const newConfirmBtn = confirmBtn.cloneNode(true) as HTMLButtonElement
    confirmBtn.parentNode!.replaceChild(newConfirmBtn, confirmBtn)

    newConfirmBtn.addEventListener('click', () => {
      this.hideConfirmModal()
      options.onConfirm()
    })
  }

  public hideConfirmModal(): void {
    const modal = getElementById('confirmModal')
    modal.classList.remove('opacity-100')
    modal.classList.add('opacity-0')
    
    // Hide after transition
    setTimeout(() => {
      modal.classList.add('hidden')
    }, 300)
  }

  public applyTheme(): void {
    const theme = this.appState.settings.theme
    const root = document.documentElement

    switch (theme) {
      case 'dark':
        root.classList.add('dark')
        break
      case 'light':
        root.classList.remove('dark')
        break
      case 'auto':
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (prefersDark) {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
        break
    }
  }

  public setupEventListeners(): void {
    // Settings modal events
    getElementById('settingsBtn').addEventListener('click', () => this.showSettingsModal())
    getElementById('closeSettings').addEventListener('click', () => this.hideSettingsModal())
    getElementById('cancelSettings').addEventListener('click', () => this.hideSettingsModal())
    getElementById('saveSettings').addEventListener('click', () => this.saveSettings())

    // Temperature slider
    getElementById('temperature').addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement
      getElementById('temperatureValue').textContent = target.value
    })

    // Available models change
    getElementById('availableModels').addEventListener('input', () => {
      this.updateModelDropdowns()
    })

    // Confirm modal events
    getElementById('closeConfirm').addEventListener('click', () => this.hideConfirmModal())
    getElementById('cancelConfirm').addEventListener('click', () => this.hideConfirmModal())

    // Close modals on overlay click
    getElementById('settingsModal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.hideSettingsModal()
    })
    getElementById('confirmModal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.hideConfirmModal()
    })

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.appState.settings.theme === 'auto') {
        this.applyTheme()
      }
    })
  }
}

