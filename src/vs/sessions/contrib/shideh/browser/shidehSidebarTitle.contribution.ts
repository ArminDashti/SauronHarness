/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { $, append } from '../../../../base/browser/dom.js';
import { IAction } from '../../../../base/common/actions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IActionViewItemService } from '../../../../platform/actions/browser/actionViewItemService.js';
import { BaseActionViewItem, IBaseActionViewItemOptions } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IInstantiationService, ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../../workbench/common/contributions.js';
import { IsSessionsWindowContext } from '../../../../workbench/common/contextkeys.js';
import { Menus } from '../../../browser/menus.js';
import { ShidehNavigationIntegratedContext } from '../common/shidehContextKeys.js';
import { Codicon } from '../../../../base/common/codicons.js';

const shidehIntegratedSidebar = ContextKeyExpr.and(IsSessionsWindowContext, ShidehNavigationIntegratedContext);

const SHIDEH_SIDEBAR_BRAND_ACTION_ID = 'shideh.sidebarBrand';
const SHIDEH_SIDEBAR_TITLE_TOGGLE_ACTION_ID = 'shideh.sidebarTitleToggle';
const SHIDEH_SIDEBAR_TOGGLE_COMMAND_ID = 'workbench.action.toggleSidebarVisibility';

class ShidehSidebarBrandWidget extends BaseActionViewItem {

	constructor(
		action: IAction,
		options: IBaseActionViewItemOptions | undefined,
		@IProductService private readonly productService: IProductService,
	) {
		super(undefined, action, options);
	}

	override render(container: HTMLElement): void {
		super.render(container);
		container.classList.add('shideh-sidebar-brand-widget');

		const mark = append(container, $('.shideh-sidebar-brand-mark', { 'aria-hidden': 'true' }));
		mark.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3.5" y="5.5" width="13" height="15" rx="3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 4h9.5a3 3 0 0 1 3 3v9.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

		append(container, $('.shideh-sidebar-brand-name')).textContent = this.productService.nameShort;
	}
}

class ShidehSidebarTitleToggleWidget extends BaseActionViewItem {

	private toggleButton: HTMLButtonElement | undefined;

	constructor(
		action: IAction,
		options: IBaseActionViewItemOptions | undefined,
		@ICommandService private readonly commandService: ICommandService,
	) {
		super(undefined, action, options);
	}

	override render(container: HTMLElement): void {
		super.render(container);
		container.classList.add('shideh-sidebar-title-toggle-widget');
		this.toggleButton = append(container, $('button.shideh-sidebar-title-toggle-button', { type: 'button' })) as HTMLButtonElement;
		this.toggleButton.setAttribute('aria-label', localize('shidehSidebarToggle', "Toggle Sidebar"));
		append(this.toggleButton, $('span.codicon.codicon-layout-sidebar-left', { 'aria-hidden': 'true' }));
		this.toggleButton.addEventListener('click', () => {
			void this.commandService.executeCommand(SHIDEH_SIDEBAR_TOGGLE_COMMAND_ID);
		});
	}
}

registerAction2(class ShidehSidebarBrandAction extends Action2 {
	constructor() {
		super({
			id: SHIDEH_SIDEBAR_BRAND_ACTION_ID,
			title: localize2('shidehSidebarBrand', "Brand"),
			menu: [{
				id: Menus.SidebarTitleLeading,
				when: shidehIntegratedSidebar,
				group: 'navigation',
				order: 0,
			}],
		});
	}
	run(): void { }
});

registerAction2(class ShidehSidebarTitleToggleAction extends Action2 {
	constructor() {
		super({
			id: SHIDEH_SIDEBAR_TITLE_TOGGLE_ACTION_ID,
			title: localize2('shidehSidebarToggle', "Toggle Sidebar"),
			icon: Codicon.layoutSidebarLeft,
			menu: [{
				id: Menus.SidebarTitle,
				when: shidehIntegratedSidebar,
				group: 'navigation',
				order: 100,
			}],
		});
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		await accessor.get(ICommandService).executeCommand(SHIDEH_SIDEBAR_TOGGLE_COMMAND_ID);
	}
});

class ShidehSidebarTitleContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.shidehSidebarTitle';

	constructor(
		@IActionViewItemService actionViewItemService: IActionViewItemService,
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		super();
		this._register(actionViewItemService.register(Menus.SidebarTitleLeading, SHIDEH_SIDEBAR_BRAND_ACTION_ID, (action, options) => {
			return instantiationService.createInstance(ShidehSidebarBrandWidget, action, options);
		}, undefined));
		this._register(actionViewItemService.register(Menus.SidebarTitle, SHIDEH_SIDEBAR_TITLE_TOGGLE_ACTION_ID, (action, options) => {
			return instantiationService.createInstance(ShidehSidebarTitleToggleWidget, action, options);
		}, undefined));
	}
}

registerWorkbenchContribution2(ShidehSidebarTitleContribution.ID, ShidehSidebarTitleContribution, WorkbenchPhase.BlockRestore);
