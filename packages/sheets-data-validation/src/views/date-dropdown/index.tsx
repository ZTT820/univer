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

import React, { useState } from 'react';
import type { CellValue, Nullable } from '@univerjs/core';
import { CellValueType, DataValidationErrorStyle, ICommandService, LocaleService, numfmt, useDependency } from '@univerjs/core';
import { Button, DatePanel } from '@univerjs/design';
import { SetRangeValuesCommand } from '@univerjs/sheets';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { IDropdownComponentProps } from '../../services/dropdown-manager.service';
import type { DateValidator } from '../../validators';
import { getCellValueOrigin } from '../../utils/get-cell-data-origin';
import { DataValidationRejectInputController } from '../../controllers/dv-reject-input.controller';
import styles from './index.module.less';

dayjs.extend(utc);

const transformDate = (value: Nullable<CellValue>) => {
    if (value === undefined || value === null || typeof value === 'boolean') {
        return undefined;
    }

    if (typeof value === 'number' || !Number.isNaN(+value)) {
        return dayjs(numfmt.format('yyyy-MM-dd HH:mm:ss', Number(value)));
    }

    const date = dayjs(value);
    if (date.isValid()) {
        return date;
    }
    return undefined;
};

export function DateDropdown(props: IDropdownComponentProps) {
    const { location, hideFn } = props;
    const { worksheet, row, col, unitId, subUnitId, workbook } = location;
    const commandService = useDependency(ICommandService);
    const rejectInputController = useDependency(DataValidationRejectInputController);
    const cellData = worksheet.getCell(row, col);
    const rule = cellData?.dataValidation?.rule;
    const validator = cellData?.dataValidation?.validator as DateValidator | undefined;
    const cellStr = getCellValueOrigin(worksheet.getCellRaw(row, col));
    const originDate = transformDate(cellStr);
    const [localDate, setLocalDate] = useState<dayjs.Dayjs | undefined>(originDate);
    const showTime = Boolean(rule?.bizInfo?.showTime);
    const date = localDate && localDate.isValid() ? localDate : dayjs();
    const localeService = useDependency(LocaleService);
    if (!cellData || !rule || !validator) {
        return;
    }

    const handleSave = async () => {
        if (!date) {
            return;
        }
        const newValue = date;
        // convert current date to utc date
        const dateStr = newValue.format(showTime ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD 00:00:00');
        const serialTime = numfmt.parseDate(dateStr)?.v as number;

        if (
            rule.errorStyle !== DataValidationErrorStyle.STOP ||
            (await validator.validator({
                value: serialTime,
                unitId,
                subUnitId,
                row,
                column: col,
                worksheet,
                workbook,
                interceptValue: dateStr.replace('Z', '').replace('T', ' '),
                t: CellValueType.NUMBER,
            }, rule))
        ) {
            commandService.executeCommand(SetRangeValuesCommand.id, {
                unitId,
                subUnitId,
                range: {
                    startColumn: col,
                    endColumn: col,
                    startRow: row,
                    endRow: row,
                },
                value: {
                    v: serialTime,
                    t: 2,
                    p: null,
                    f: null,
                    si: null,
                    s: {
                        n: {
                            pattern: showTime ? 'yyyy-MM-dd hh:mm:ss' : 'yyyy-MM-dd',
                        },
                    },
                },
            });
            hideFn();
        } else {
            rejectInputController.showReject(validator.getRuleFinalError(rule));
        }
    };

    return (
        <div className={styles.dvDateDropdown}>
            <DatePanel
                defaultValue={date}
                pickerValue={date}
                showTime={showTime || undefined}
                onSelect={async (newValue) => {
                    setLocalDate(newValue);
                }}
                onPanelChange={(value) => {
                    setLocalDate(value);
                }}
                disabledDate={(current) => !numfmt.parseDate(current.format('YYYY-MM-DD'))}
            />
            <div className={styles.dvDateDropdownBtns}>
                <Button size="small" type="primary" onClick={handleSave} disabled={!date.isValid()}>
                    {localeService.t('dataValidation.alert.ok')}
                </Button>
            </div>
        </div>

    );
}
