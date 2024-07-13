import { Tools } from "../shared";
import { IRange, IWorksheetData } from "../types/interfaces";

export interface ITableGroup {
    id: string;
    name: string, 
    description?: string, 
    range: IRange, 
    minRow?: number, 
    condition?: string
    variable?: string
};

export class TableGroupManager{

    private _tableGroups: ITableGroup[];

    constructor(
        private readonly _config: IWorksheetData,
        data: ITableGroup[]
    ) {
        this._tableGroups = data;
    }

    getTableGroups = () => {
        return this._tableGroups;
    }

    getGroupByRange = (range: IRange) => {
        return this._tableGroups.filter(group => {
            const {startRow, startColumn, endRow, endColumn} = group.range;
            if (startRow === range.startRow && startColumn === range.startColumn && endRow === range.endRow && endColumn === range.endColumn) {
                return true;
            }
            return false;
        })[0];
    }

    saveTableGroup = (tableGroup: ITableGroup) => {
        const idx = this._tableGroups.findIndex((group) => group.id === tableGroup.id);
        if (idx > -1) {
            this._tableGroups.splice(idx, 1, tableGroup);
        } else {
            this._tableGroups.push(tableGroup);
        }
    }

    deleteTableGroup = (tableGroup: ITableGroup) => {
        const idx = this._tableGroups.findIndex((group) => group.id === tableGroup.id);
        if (idx > -1) {
            this._tableGroups.splice(idx, 1);
        } 
    }

    deleteAll = () => {
        if (this._tableGroups.length > 0) {
            this._tableGroups.splice(0, this._tableGroups.length-1);
        } 
    }
} 