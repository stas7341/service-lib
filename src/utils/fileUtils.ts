import fs from 'fs';

export abstract class FileUtils {
    static readTextFileToArray(filePath: string): string[] {
        if (!fs.existsSync(filePath)) {
            return [];
        }
        const data = fs.readFileSync(filePath, 'utf-8');
        if (!data) return [];
        return data.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    }

    static readTextFileToObjArray(filePath: string): Map<string, string>[] {
        const arrRows = this.readTextFileToArray(filePath).filter(row => row.trim().length > 0);
        if (arrRows.length === 0) {
            return [];
        }

        const mapRows: Map<string, string>[] = [];
        const headers: string[] = arrRows[0].split(',').map(h => h.trim());

        for (let i = 1; i < arrRows.length; i++) {
            const rowCols = arrRows[i].split(',');
            const rowMap = new Map<string, string>();
            for (let j = 0; j < headers.length; j++) {
                rowMap.set(headers[j], rowCols[j] !== undefined ? rowCols[j].trim() : '');
            }
            mapRows.push(rowMap);
        }

        return mapRows;
    }

    static fileExists(filePath: string): boolean {
        return fs.existsSync(filePath);
    }

    static readJsonFile<T = any>(filePath: string): T | null {
        try {
            if (!this.fileExists(filePath)) return null;
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content) as T;
        } catch {
            return null;
        }
    }

    static writeJsonFile(filePath: string, data: any, pretty = false): boolean {
        try {
            const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
            fs.writeFileSync(filePath, content, 'utf-8');
            return true;
        } catch {
            return false;
        }
    }
}
