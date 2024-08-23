/**
 * Copyright 2023-present DreamNum Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { ICommand } from '@univerjs/core';
import { CommandType } from '@univerjs/core';
import { ISidebarService } from '@univerjs/ui';
import { SheetPermissionPanelModel } from '../../services/permission/sheet-permission-panel.model';
import { SheetPermissionUserManagerService } from '../../services/permission/sheet-permission-user-list.service';
import { UNIVER_SHEET_PERMISSION_PANEL, UNIVER_SHEET_PERMISSION_PANEL_FOOTER } from '../../consts/permission';

export interface IPermissionOpenPanelParam {
    fromSheetBar?: boolean;
    showDetail?: boolean;
}

export const SheetPermissionOpenPanelOperation: ICommand<IPermissionOpenPanelParam> = {
    type: CommandType.OPERATION,
    id: 'sheet-permission.operation.openPanel',
    async handler(accessor, _params = {}) {
        const sidebarService = accessor.get(ISidebarService);
        const sheetPermissionPanelModel = accessor.get(SheetPermissionPanelModel);
        const sheetPermissionUserManagerService = accessor.get(SheetPermissionUserManagerService);

        const { showDetail = true, fromSheetBar = false } = _params;

        const sidebarProps = {
            header: { title: 'permission.panel.title' },
            children: {
                label: UNIVER_SHEET_PERMISSION_PANEL,
                showDetail,
                fromSheetBar,
            },
            width: 330,
            footer: {
                label: UNIVER_SHEET_PERMISSION_PANEL_FOOTER,
                showDetail,
            },
            onClose: () => {
                sheetPermissionPanelModel.reset();
                sheetPermissionUserManagerService.reset();
            },
        };

        sheetPermissionPanelModel.setVisible(true);
        sidebarService.open(sidebarProps);

        return true;
    },
};
