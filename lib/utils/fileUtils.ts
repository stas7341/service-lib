"use strict";
var fs = require('fs');

export abstract class FileUtils {
    static readTextFileToArray(filePath: string): string[] {
        var arrRows: string[];
        var data = fs.readFileSync(filePath);
        arrRows = data.toString().split('\n');
        return arrRows;
    }

    static readTextFileToObjArray(filePath: string): Map<string, string>[] {
        var mapRows: Map<string, string>[] = [];
        var arrRows: string[] = [];
        var data = fs.readFileSync(filePath);
        arrRows = data.toString().split('\n');

        //header line
        var headers: string[] = arrRows[0].split(',');

        //running through data rows
        for (var i = 1; i < arrRows.length; i++) {
            var row = new Map<string, string>();
            for (var header in headers) {
                row.set(headers[header], arrRows[i].split(',')[header])
            }
            mapRows.push(row);

        }

        return mapRows;
    }

}
