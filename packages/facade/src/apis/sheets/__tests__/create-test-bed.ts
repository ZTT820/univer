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

import type { Dependency, IWorkbookData, Workbook } from '@univerjs/core';
import {
    ILogService,
    Inject,
    Injector,
    IUniverInstanceService,
    LocaleService,
    LocaleType,
    LogLevel,
    Plugin,
    Univer,
    UniverInstanceType,
} from '@univerjs/core';
import { FunctionService, IFunctionService } from '@univerjs/engine-formula';
import { ISocketService, WebSocketService } from '@univerjs/network';
import { SheetInterceptorService, SheetsSelectionsService } from '@univerjs/sheets';
import {
    DescriptionService,
    IDescriptionService,
    IRegisterFunctionService,
    RegisterFunctionService,
} from '@univerjs/sheets-formula';
import enUS from '@univerjs/sheets-formula/locale/en-US';
import zhCN from '@univerjs/sheets-formula/locale/zh-CN';

import { FUniver } from '../../facade';

function getTestWorkbookDataDemo(): IWorkbookData {
    return {
        id: 'test',
        appVersion: '3.0.0-alpha',
        sheets: {
            sheet1: {
                id: 'sheet1',
                name: 'sheet1',
                cellData: {},
            },
        },
        locale: LocaleType.ZH_CN,
        name: '',
        sheetOrder: [],
        styles: {},
    };
}

export interface ITestBed {
    univer: Univer;
    get: Injector['get'];
    sheet: Workbook;
    univerAPI: FUniver;
}

export function createTestBed(workbookData?: IWorkbookData, dependencies?: Dependency[]): ITestBed {
    const univer = new Univer();
    const injector = univer.__getInjector();

    class TestPlugin extends Plugin {
        static override pluginName = 'test-plugin';
        static override type = UniverInstanceType.UNIVER_SHEET;

        constructor(
            _config: undefined,
            @Inject(Injector) override readonly _injector: Injector
        ) {
            super();
        }

        override onStarting(): void {
            const injector = this._injector;
            injector.add([SheetsSelectionsService]);
            injector.add([SheetInterceptorService]);
            injector.add([IRegisterFunctionService, { useClass: RegisterFunctionService }]);
            injector.add([
                IDescriptionService,
                {
                    useFactory: () => this._injector.createInstance(DescriptionService, undefined),
                },
            ]);
            injector.add([IFunctionService, { useClass: FunctionService }]);
            injector.add([ISocketService, { useClass: WebSocketService }]);

            dependencies?.forEach((d) => injector.add(d));
        }
    }

    injector.get(LocaleService).load({ zhCN, enUS });

    univer.registerPlugin(TestPlugin);
    const sheet = univer.createUniverSheet(workbookData || getTestWorkbookDataDemo());

    const univerInstanceService = injector.get(IUniverInstanceService);
    univerInstanceService.focusUnit('test');
    const logService = injector.get(ILogService);

    logService.setLogLevel(LogLevel.SILENT); // change this to `LogLevel.VERBOSE` to debug tests via logs

    const univerAPI = FUniver.newAPI(injector);

    return {
        univer,
        get: injector.get.bind(injector),
        sheet,
        univerAPI,
    };
}
