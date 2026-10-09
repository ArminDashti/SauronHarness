/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from '../../../../base/browser/dom.js';
import { SelectBox } from '../../../../base/browser/ui/selectBox/selectBox.js';
import { Toggle } from '../../../../base/browser/ui/toggle/toggle.js';
import { InputBox } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { autorun } from '../../../../base/common/observable.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { McpAccessValue, mcpAccessConfig } from '../../../../platform/mcp/common/mcpManagement.js';
import { ISecretStorageService } from '../../../../platform/secrets/common/secrets.js';
import { defaultSelectBoxStyles, defaultToggleStyles, getInputBoxStyle } from '../../../../platform/theme/browser/defaultStyles.js';
import { AICustomizationManagementCommands, AICustomizationManagementSection } from '../../../../workbench/contrib/chat/browser/aiCustomization/aiCustomizationManagement.js';
import { McpCommandIds } from '../../../../workbench/contrib/mcp/common/mcpCommandIds.js';
import { IMcpService } from '../../../../workbench/contrib/mcp/common/mcpTypes.js';
import { IPreferencesService } from '../../../../workbench/services/preferences/common/preferences.js';
import { mcpServerIcon } from '../../../../workbench/contrib/chat/browser/aiCustomization/aiCustomizationIcons.js';

export const SHIDEH_MCP_AUTHENTICATION_SETTING = 'shideh.mcp.authentication';
export const SHIDEH_MCP_ALLOWED_TRANSPORTS_SETTING = 'shideh.mcp.allowedTransports';
export const SHIDEH_MCP_API_KEY_SECRET = 'shideh.mcp.apiKey';

const SHIDEH_MCP_TRANSPORTS = ['stdio', 'sse', 'http'] as const;

export class ShidehConnectorsPanel extends Disposable {

	constructor(
		parent: HTMLElement,
		@ICommandService private readonly commandService: ICommandService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IContextViewService private readonly contextViewService: IContextViewService,
		@ISecretStorageService private readonly secretStorageService: ISecretStorageService,
		@IClipboardService private readonly clipboardService: IClipboardService,
		@IMcpService private readonly mcpService: IMcpService,
		@IPreferencesService private readonly preferencesService: IPreferencesService,
	) {
		super();

		const root = DOM.append(parent, DOM.$('.shideh-connectors'));
		this.renderHeader(root);
		this.renderSettingsCard(root);
		this.renderManageCard(root);
	}

	private renderHeader(root: HTMLElement): void {
		const header = DOM.append(root, DOM.$('.shideh-connectors-header'));
		const heading = DOM.append(header, DOM.$('.shideh-connectors-heading'));
		DOM.append(heading, DOM.$('h2.shideh-connectors-title')).textContent = localize('shidehConnectorsTitle', "Connectors");
		DOM.append(heading, DOM.$('p.shideh-connectors-subtitle')).textContent = localize('shidehConnectorsSubtitle', "MCP servers and Copilot connectors.");

		const addButton = DOM.append(header, DOM.$('button.shideh-connectors-add-button')) as HTMLButtonElement;
		addButton.type = 'button';
		addButton.appendChild(renderIcon(Codicon.add));
		DOM.append(addButton, DOM.$('span')).textContent = localize('shidehConnectorsAddMcp', "Add MCP server");
		this._register(DOM.addDisposableListener(addButton, 'click', () => this.commandService.executeCommand(McpCommandIds.AddConfiguration)));
	}

	private renderSettingsCard(root: HTMLElement): void {
		const card = DOM.append(root, DOM.$('.shideh-connectors-card'));
		const cardHeader = DOM.append(card, DOM.$('.shideh-connectors-card-header.shideh-connectors-card-header--interactive'));
		this.appendCardIcon(cardHeader, Codicon.settingsGear);
		this.appendCardLabels(cardHeader,
			localize('shidehConnectorsSettingsTitle', "MCP settings"),
			localize('shidehConnectorsSettingsDesc', "Configure MCP enablement and authentication."));
		const chevron = DOM.append(cardHeader, DOM.$('.shideh-connectors-card-chevron'));
		chevron.appendChild(renderIcon(Codicon.chevronUp));

		const body = DOM.append(card, DOM.$('.shideh-connectors-card-body'));
		this.renderEnableRow(body);
		this.renderAuthenticationRow(body);
		this.renderApiKeyRow(body);
		this.renderTransportsRow(body);
		this.renderAdvancedRow(body);

		let collapsed = false;
		const toggleCollapsed = () => {
			collapsed = !collapsed;
			body.classList.toggle('shideh-connectors-card-body--hidden', collapsed);
			chevron.replaceChildren(renderIcon(collapsed ? Codicon.chevronDown : Codicon.chevronUp));
		};
		this._register(DOM.addDisposableListener(cardHeader, 'click', toggleCollapsed));
	}

	private renderEnableRow(body: HTMLElement): void {
		const row = this.appendRow(body, localize('shidehConnectorsEnableMcp', "Enable MCP"), localize('shidehConnectorsEnableMcpDesc', "Allow MCP servers and connectors to be used."), localize('shidehConnectorsEnableMcpHelp', "Turns chat.mcp.access between All and None."));
		const controlHost = DOM.append(row, DOM.$('.shideh-settings-row-control'));
		const state = DOM.append(controlHost, DOM.$('span.shideh-connectors-toggle-label'));

		const isEnabled = () => this.configurationService.getValue<string>(mcpAccessConfig) !== McpAccessValue.None;
		const initial = isEnabled();
		const toggle = this._register(new Toggle({
			title: localize('shidehConnectorsEnableMcpToggle', "Enable MCP"),
			isChecked: initial,
			...defaultToggleStyles,
		}));
		toggle.domNode.classList.add('shideh-settings-toggle');
		controlHost.insertBefore(toggle.domNode, state);
		state.textContent = initial ? localize('shidehConnectorsOn', "On") : localize('shidehConnectorsOff', "Off");

		this._register(toggle.onChange(() => {
			state.textContent = toggle.checked ? localize('shidehConnectorsOn', "On") : localize('shidehConnectorsOff', "Off");
			void this.configurationService.updateValue(mcpAccessConfig, toggle.checked ? McpAccessValue.All : McpAccessValue.None);
		}));
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(mcpAccessConfig)) {
				const enabled = isEnabled();
				toggle.checked = enabled;
				state.textContent = enabled ? localize('shidehConnectorsOn', "On") : localize('shidehConnectorsOff', "Off");
			}
		}));
	}

	private renderAuthenticationRow(body: HTMLElement): void {
		const row = this.appendRow(body, localize('shidehConnectorsAuth', "Authentication"), localize('shidehConnectorsAuthDesc', "Choose how connections to MCP servers are authenticated."), localize('shidehConnectorsAuthHelp', "Authentication method used for MCP server connections."));
		const controlHost = DOM.append(row, DOM.$('.shideh-settings-row-control'));
		const options = [
			{ value: 'apiKey', label: localize('shidehConnectorsAuthApiKey', "API Key") },
			{ value: 'none', label: localize('shidehConnectorsAuthNone', "None") },
		];
		const current = this.configurationService.getValue<string>(SHIDEH_MCP_AUTHENTICATION_SETTING);
		const selectedIndex = Math.max(0, options.findIndex(option => option.value === current));
		const select = this._register(new SelectBox(
			options.map(option => ({ text: option.label })),
			selectedIndex,
			this.contextViewService,
			{ ...defaultSelectBoxStyles },
			{ ariaLabel: localize('shidehConnectorsAuthAria', "Authentication") },
		));
		select.render(controlHost);
		this._register(select.onDidSelect(event => {
			const option = options[event.index];
			if (option) {
				void this.configurationService.updateValue(SHIDEH_MCP_AUTHENTICATION_SETTING, option.value);
			}
		}));
	}

	private renderApiKeyRow(body: HTMLElement): void {
		const row = this.appendRow(body, localize('shidehConnectorsApiKey', "API Key"), localize('shidehConnectorsApiKeyDesc', "Used to authenticate requests to MCP servers."), localize('shidehConnectorsApiKeyHelp', "Stored in secret storage, not in settings.json."));
		const controlHost = DOM.append(row, DOM.$('.shideh-settings-row-control.shideh-connectors-key-control'));

		const input = this._register(new InputBox(controlHost, this.contextViewService, {
			ariaLabel: localize('shidehConnectorsApiKeyAria', "API Key"),
			type: 'password',
			placeholder: localize('shidehConnectorsApiKeyPlaceholder', "Enter API key"),
			inputBoxStyles: getInputBoxStyle({}),
		}));
		input.element.classList.add('shideh-connectors-key-input');

		void this.secretStorageService.get(SHIDEH_MCP_API_KEY_SECRET).then(value => {
			if (!this._store.isDisposed && value !== undefined) {
				input.value = value;
			}
		});

		const commit = () => {
			void this.secretStorageService.set(SHIDEH_MCP_API_KEY_SECRET, input.value.trim());
		};
		this._register(DOM.addDisposableListener(input.inputElement, 'blur', commit));

		let visible = false;
		const eyeButton = DOM.append(controlHost, DOM.$('button.shideh-connectors-icon-button')) as HTMLButtonElement;
		eyeButton.type = 'button';
		const updateEye = () => {
			eyeButton.setAttribute('aria-label', visible ? localize('shidehConnectorsHideKey', "Hide API key") : localize('shidehConnectorsShowKey', "Show API key"));
			eyeButton.replaceChildren(renderIcon(visible ? Codicon.eyeClosed : Codicon.eye));
		};
		updateEye();
		this._register(DOM.addDisposableListener(eyeButton, 'click', () => {
			visible = !visible;
			input.inputElement.type = visible ? 'text' : 'password';
			updateEye();
		}));

		const copyButton = DOM.append(controlHost, DOM.$('button.shideh-connectors-copy-button')) as HTMLButtonElement;
		copyButton.type = 'button';
		copyButton.textContent = localize('shidehConnectorsCopy', "Copy");
		this._register(DOM.addDisposableListener(copyButton, 'click', () => {
			void this.clipboardService.writeText(input.value);
		}));
	}

	private renderTransportsRow(body: HTMLElement): void {
		const row = this.appendRow(body, localize('shidehConnectorsTransports', "Allowed transports"), localize('shidehConnectorsTransportsDesc', "Select which transports are allowed."), localize('shidehConnectorsTransportsHelp', "Transports MCP servers may use to connect."));
		const controlHost = DOM.append(row, DOM.$('.shideh-settings-row-control.shideh-connectors-transports'));

		const configured = this.configurationService.getValue<string[]>(SHIDEH_MCP_ALLOWED_TRANSPORTS_SETTING);
		const allowed = new Set(Array.isArray(configured) ? configured : SHIDEH_MCP_TRANSPORTS);
		const checkboxes = new Map<string, HTMLInputElement>();

		const commit = () => {
			const next = SHIDEH_MCP_TRANSPORTS.filter(id => checkboxes.get(id)?.checked);
			void this.configurationService.updateValue(SHIDEH_MCP_ALLOWED_TRANSPORTS_SETTING, next);
		};

		for (const transport of SHIDEH_MCP_TRANSPORTS) {
			const label = DOM.append(controlHost, DOM.$('label.shideh-connectors-transport')) as HTMLLabelElement;
			const checkbox = DOM.append(label, DOM.$('input')) as HTMLInputElement;
			checkbox.type = 'checkbox';
			checkbox.checked = allowed.has(transport);
			checkboxes.set(transport, checkbox);
			DOM.append(label, DOM.$('span')).textContent = transport;
			this._register(DOM.addDisposableListener(checkbox, 'change', commit));
		}
	}

	private renderAdvancedRow(body: HTMLElement): void {
		const row = this.appendRow(body, localize('shidehConnectorsAdvanced', "Advanced options"), undefined, undefined);
		row.classList.add('shideh-settings-row-interactive');
		row.tabIndex = 0;
		row.setAttribute('role', 'button');
		const chevron = DOM.append(row, DOM.$('.shideh-connectors-card-chevron'));
		chevron.appendChild(renderIcon(Codicon.chevronRight));
		const run = () => this.preferencesService.openSettings({ query: 'shideh.mcp' });
		this._register(DOM.addDisposableListener(row, 'click', run));
		this._register(DOM.addDisposableListener(row, 'keydown', (e: KeyboardEvent) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				void run();
			}
		}));
	}

	private renderManageCard(root: HTMLElement): void {
		const card = DOM.append(root, DOM.$('.shideh-connectors-card'));
		const cardHeader = DOM.append(card, DOM.$('.shideh-connectors-card-header.shideh-connectors-card-header--interactive'));
		cardHeader.tabIndex = 0;
		cardHeader.setAttribute('role', 'button');
		this.appendCardIcon(cardHeader, mcpServerIcon);
		this.appendCardLabels(cardHeader,
			localize('shidehConnectorsManageTitle', "Manage MCP servers"),
			localize('shidehConnectorsManageDesc', "View, edit, and manage your installed MCP servers."));

		const badge = DOM.append(cardHeader, DOM.$('.shideh-connectors-badge'));
		this._register(autorun(reader => {
			const count = this.mcpService.servers.read(reader).length;
			badge.textContent = count === 1
				? localize('shidehConnectorsOneServer', "1 server")
				: localize('shidehConnectorsServerCount', "{0} servers", count);
		}));

		const chevron = DOM.append(cardHeader, DOM.$('.shideh-connectors-card-chevron'));
		chevron.appendChild(renderIcon(Codicon.chevronRight));

		const run = () => this.commandService.executeCommand(AICustomizationManagementCommands.OpenEditor, AICustomizationManagementSection.McpServers);
		this._register(DOM.addDisposableListener(cardHeader, 'click', run));
		this._register(DOM.addDisposableListener(cardHeader, 'keydown', (e: KeyboardEvent) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				void run();
			}
		}));
	}

	private appendCardIcon(parent: HTMLElement, icon: ThemeIcon): void {
		const iconHost = DOM.append(parent, DOM.$('.shideh-connectors-card-icon'));
		iconHost.appendChild(renderIcon(icon));
	}

	private appendCardLabels(parent: HTMLElement, title: string, description: string): void {
		const labels = DOM.append(parent, DOM.$('.shideh-connectors-card-labels'));
		DOM.append(labels, DOM.$('.shideh-connectors-card-title')).textContent = title;
		DOM.append(labels, DOM.$('.shideh-connectors-card-description')).textContent = description;
	}

	private appendRow(body: HTMLElement, label: string, description: string | undefined, help: string | undefined): HTMLElement {
		const row = DOM.append(body, DOM.$('.shideh-settings-row'));
		const labels = DOM.append(row, DOM.$('.shideh-settings-row-labels'));
		const titleLine = DOM.append(labels, DOM.$('.shideh-settings-row-label'));
		titleLine.textContent = label;
		if (help) {
			const helpIcon = DOM.append(titleLine, DOM.$('span.shideh-connectors-help'));
			helpIcon.appendChild(renderIcon(Codicon.question));
			helpIcon.title = help;
			helpIcon.setAttribute('aria-label', help);
		}
		if (description) {
			DOM.append(labels, DOM.$('.shideh-settings-row-description')).textContent = description;
		}
		return row;
	}
}
