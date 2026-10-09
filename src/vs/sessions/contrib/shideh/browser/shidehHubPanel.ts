/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from '../../../../base/browser/dom.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { mcpServerIcon, pluginIcon, skillIcon } from '../../../../workbench/contrib/chat/browser/aiCustomization/aiCustomizationIcons.js';
import { AICustomizationManagementCommands, AICustomizationManagementSection } from '../../../../workbench/contrib/chat/browser/aiCustomization/aiCustomizationManagement.js';
import { IShidehHubDownloadSource, SHIDEH_HUB_MCP_SOURCES, SHIDEH_HUB_PLUGIN_SOURCES, SHIDEH_HUB_SKILL_SOURCES } from '../common/shidehHubCatalog.js';

export class ShidehHubPanel extends Disposable {

	constructor(
		parent: HTMLElement,
		@IOpenerService private readonly openerService: IOpenerService,
		@ICommandService private readonly commandService: ICommandService,
	) {
		super();
		const root = DOM.append(parent, DOM.$('.shideh-hub-panel'));

		const header = DOM.append(root, DOM.$('.shideh-hub-header'));
		const intro = DOM.append(header, DOM.$('h2.shideh-hub-intro'));
		intro.textContent = localize('shidehHubIntro', "Browse catalogs for skills, MCP servers, and agent plugins.");
		const introHint = DOM.append(header, DOM.$('p.shideh-hub-intro-hint'));
		introHint.textContent = localize('shidehHubIntroHint', "Each link opens the publisher site; use Marketplace to install inside Shideh.");

		this.renderSubsection(root, skillIcon, localize('shidehHubSubsection.skills', "Skills"), SHIDEH_HUB_SKILL_SOURCES, AICustomizationManagementSection.Skills);
		this.renderSubsection(root, mcpServerIcon, localize('shidehHubSubsection.mcp', "MCP"), SHIDEH_HUB_MCP_SOURCES, AICustomizationManagementSection.McpServers);
		this.renderSubsection(root, pluginIcon, localize('shidehHubSubsection.plugins', "Plugins"), SHIDEH_HUB_PLUGIN_SOURCES, AICustomizationManagementSection.Plugins);
	}

	private renderSubsection(
		parent: HTMLElement,
		icon: ThemeIcon,
		title: string,
		sources: readonly IShidehHubDownloadSource[],
		marketplaceSection: AICustomizationManagementSection,
	): void {
		const block = DOM.append(parent, DOM.$('.shideh-hub-subsection'));
		const heading = DOM.append(block, DOM.$('.shideh-hub-subsection-title'));
		const headingIcon = DOM.append(heading, DOM.$('.shideh-hub-subsection-title-icon'));
		headingIcon.appendChild(renderIcon(icon));
		DOM.append(heading, DOM.$('span.shideh-hub-subsection-title-text')).textContent = title;

		const list = DOM.append(block, DOM.$('ol.shideh-hub-source-list'));
		for (const [index, source] of sources.entries()) {
			const item = DOM.append(list, DOM.$('li.shideh-hub-source-item')) as HTMLLIElement;
			const rank = DOM.append(item, DOM.$('span.shideh-hub-source-rank'));
			rank.textContent = String(index + 1);
			rank.setAttribute('aria-hidden', 'true');

			const body = DOM.append(item, DOM.$('.shideh-hub-source-body'));
			DOM.append(body, DOM.$('.shideh-hub-source-name')).textContent = source.name;
			DOM.append(body, DOM.$('p.shideh-hub-source-description')).textContent = source.description;

			const actions = DOM.append(item, DOM.$('.shideh-hub-source-actions'));
			this.renderActionButton(actions, {
				label: localize('shidehHubOpenSource', "Open site"),
				icon: Codicon.linkExternal,
				primary: false,
				onClick: () => {
					void this.openerService.open(URI.parse(source.url));
				},
			});
			this.renderActionButton(actions, {
				label: localize('shidehHubOpenMarketplace', "Marketplace"),
				icon: Codicon.library,
				primary: true,
				onClick: () => {
					void this.commandService.executeCommand(AICustomizationManagementCommands.OpenMarketplace, marketplaceSection);
				},
			});
		}
	}

	private renderActionButton(
		parent: HTMLElement,
		options: { label: string; icon: ThemeIcon; primary: boolean; onClick: () => void },
	): void {
		const button = DOM.append(parent, DOM.$(`button.shideh-hub-source-button${options.primary ? '.shideh-hub-source-button-primary' : ''}`)) as HTMLButtonElement;
		button.type = 'button';
		const iconHost = DOM.append(button, DOM.$('span.shideh-hub-source-button-icon'));
		iconHost.appendChild(renderIcon(options.icon));
		iconHost.setAttribute('aria-hidden', 'true');
		DOM.append(button, DOM.$('span.shideh-hub-source-button-label')).textContent = options.label;
		this._register(DOM.addDisposableListener(button, 'click', options.onClick));
	}
}
