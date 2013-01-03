(function() {
	steal = steal || {};
	steal.instrument = steal.instrument || {};
    steal.instrument.coberturaReporter = {};

	steal.instrument.coberturaReporter.createReport = createReport;

    // these private functions are exposed to enable testing
	steal.instrument.coberturaReporter._createClassInfo = _createClassInfo;
	steal.instrument.coberturaReporter._createPackageInfo = _createPackageInfo;
	steal.instrument.coberturaReporter._groupFilesByPackage = _groupFilesByPackage;
	steal.instrument.coberturaReporter._createPackages = _createPackages;

    var S= {
        endsWith: function(s, suffix) {
            return s.indexOf(suffix, s.length - suffix.length) !== -1;
        },

        replaceAll: function(s, search, replace) {
            var reg= new RegExp(search, 'g');
            return s.replace(reg, replace);
        },

        repeat: function(s, n) {
            n= n || 1;
            return Array(n+1).join(s);
        }
    };

    function _createClassInfo(fileName, fileCoverageData) {
        var r= {};
        r.filename= fileName;
        r.name= convertFileNameToClassName(fileName);

        r.methods = [];
        r.lines = createLines(fileCoverageData.linesUsed);

        r.branchRate = '1.0';
        r.complexity = '1.0';

        r.linesCovered = r.lines.linesCovered;
        r.linesOfCode = r.lines.linesOfCode;
        r.linesTotal = fileCoverageData.lines;
        r.lineRate = r.linesCovered / r.linesOfCode;
        return r;
    }

    function convertFileNameToClassName(fileName) {
        var name = S.replaceAll(fileName, '/', '.');
        if (S.endsWith(name.toLowerCase(), '.js')) {
            name = name.substring(0, name.length-3);
        }
        return name;
    }

    function createLines(linesUsed) {
        linesUsed = sortLinesUsed(linesUsed);
        var linesCovered= 0, linesOfCode=0;
        var lines= linesUsed.map(function(line) {
            linesOfCode++;
            if (line.hits > 0) linesCovered++;
            return createLine(line.i, line.hits);
        });

        lines.linesCovered = linesCovered;
        lines.linesOfCode = linesOfCode;
        return lines;
    }

    function sortLinesUsed(linesUsed) {
        var ar= [];
        for (var i in linesUsed) {
            var hits = linesUsed[i];
            ar.push({i:i, hits:hits});
        }
        return ar.sort(function(a,b){
            return a.i - b.i;
        });
    }

    function createLine(number, hits) {
        return {
            number: parseInt(number, 10),
            hits: hits,
            branch: false
        }
    }

    function _createPackageInfo(directory, files) {
        var r= {};
        r.name= S.replaceAll(directory, '/', '.');

        r.classes= createClasses(files);
        r.lineRate= r.classes.linesCovered / r.classes.linesOfCode;
        r.branchRate = '1.0';
        r.complexity = '1.0';
        r.linesOfCode = r.classes.linesOfCode;
        r.linesCovered = r.classes.linesCovered;
        r.linesTotal = r.classes.linesTotal;
        return r;
    }

    function createClasses(files) {
        var fileNames = extractFileNames(files);
        var linesCovered=0, linesOfCode= 0, linesTotal=0;
        var classes= fileNames.map(function(fn) {
            var classInfo = _createClassInfo(fn, files[fn]);
            linesCovered += classInfo.linesCovered;
            linesOfCode += classInfo.linesOfCode;
            linesTotal += classInfo.linesTotal;
            return classInfo;
        });
        classes.linesOfCode = linesOfCode;
        classes.linesCovered = linesCovered;
        classes.linesTotal = linesTotal;
        return classes;
    }

    function extractFileNames(files) {
        return Object.keys(files).sort();
    }

    function _groupFilesByPackage(files) {
        var fileNames = extractFileNames(files);
        var packageNames = extractPackageNames(fileNames);

        var ar = [];
        for (var i= 0, n=packageNames.length; i<n; i++) {
            var pn= packageNames[i];
            var fileNamesForPackage = findFileNamesForPackage(pn, fileNames);
            var filesForPackage = findFilesForPackage(fileNamesForPackage, files);
            ar.push({packageName:pn, files:filesForPackage});
        }
        return ar;
    }

    function extractPackageNames(fileNames) {
        var packageNames= fileNames.map(extractPackageName);
        var unique = packageNames.filter(function(el, pos) {
            return packageNames.indexOf(el) === pos;
        });
        return unique.sort();
    }

    function extractPackageName(fileName) {
        var i= fileName.lastIndexOf('/');
        if (i<0) return '';
        return fileName.substring(0, i);
    }

    function findFileNamesForPackage(packageName, fileNames) {
        return fileNames.filter(function(fileName) {
           return packageName === extractPackageName(fileName);
        });
    }

    function findFilesForPackage(fileNamesForPackage, files) {
        var r= {};
        for (var i= 0, n=fileNamesForPackage.length; i<n; i++) {
            var fn= fileNamesForPackage[i];
            r[fn] = files[fn];
        }
        return r;
    }

    function _createPackages(files) {
        var linesCovered=0, linesOfCode= 0, linesTotal=0;
        var groups = _groupFilesByPackage(files);
        var r= [];
        groups.forEach(function(el) {
            var pi= _createPackageInfo(el.packageName, el.files);
            r.push(pi);
            linesCovered += pi.linesCovered;
            linesOfCode += pi.linesOfCode;
            linesTotal += pi.linesTotal;
        });
        r.linesOfCode = linesOfCode;
        r.linesCovered = linesCovered;
        r.linesTotal = linesTotal;
        return r;
    }

    var X = {
        header0: '<?xml version="1.0"?>',
        header1: '<!DOCTYPE coverage SYSTEM "http://cobertura.sourceforge.net/xml/coverage-04.dtd">',

        createTagStart: function(tag, attributes) {
            var ar= [];
            ar.push('<', tag);
            for (var i in attributes) {
                var val= attributes[i];
                ar.push(' ', i, '="', val, '"');
            }
            ar.push('>');
            return ar.join('');
        },

        createTagEnd: function(tag) {
            return '</' + tag + '>';
        },

        createTag: function(tag, value, attributes) {
            return X.createTagStart(tag, attributes) + value + X.createTagEnd(tag);
        },

        tab: function(indent) {
            if (!indent || indent===0) return '';
            return S.repeat('\t', indent);
        },

        append: function(ar, st, indent) {
            ar.push(X.tab(indent) + st);
        }
    };

    function dumpObject(array, object, name, maxElements) {
        maxElements = maxElements || 9007199254740992; // max integer
        array.push(X.createTagStart(name, {}) );
        var counter=0;
        for (var i in object) {
            counter++;
            if (counter>maxElements) break;
            var val = object[i];
            array.push('\t' + X.createTag(i, val, {}));
        }
        array.push(X.createTagEnd(name));
    }

    function printDebug(ar, files){
        dumpObject(ar, files, 'files', 10);
        dumpObject(ar, files['clui/clui.js'].linesUsed, 'files["clui/clui.js"].linesUsed');
        dumpObject(ar, files['clui/hub/hub.js'].linesUsed, 'files["clui/hub/hub.js"].linesUsed');
    }

    function createReport(coverageData, basePath) {
        var ar= [];
        var files= getFiles(coverageData);
//        printDebug(ar, files);

        ar.push(X.header0);
        ar.push(X.header1);
        var packages = _createPackages(files);
        ar.push( createCoverageLine(packages) );
        X.append(ar, '<sources>', 1);
        if(basePath){
          X.append(ar, '<source>' + basePath + '</source>', 2);
        }
        X.append(ar, '</sources>', 1);

        appendPackages(ar, packages);
        X.append(ar, '</coverage>', 0);
        return ar.join('\n');
    }

    function getFiles(coverageData) {
        if (coverageData === undefined) return [];
        if (!coverageData.files) return [];
        return coverageData.files;
    }

    function createCoverageLine(packages) {
        var linesOfCode= packages.linesOfCode;
        var timestamp = new Date().getTime();

        return X.createTagStart('coverage', {
            'line-rate': linesOfCode===0? '0.0' : packages.linesCovered / linesOfCode,
            'branch-rate': '1.0',
            'lines-covered': packages.linesCovered,
            'lines-valid': packages.linesTotal,
            'branches-covered': 0,
            'branches-valid': 0,
            'complexity': '1.0',
            'version': '1.9.4.1',
            'timestamp': timestamp
        });
    }

    function appendPackages(ar, packages) {
        X.append(ar, '<packages>', 1);
        packages.forEach(function(pack) {
            appendPackage(ar, pack);
        });
        X.append(ar, '</packages>', 1);
    }

    function appendPackage(ar, pack) {
        X.append(ar, createPackageLine(pack), 2);
        X.append(ar, '<classes>', 3);

        pack.classes.forEach(function(classInfo) {
            appendClass(ar, classInfo);
        });
        X.append(ar, '</classes>', 3);
        X.append(ar, '</package>', 2);
    }

    function createPackageLine(pack) {
        return X.createTagStart('package', {
            name: pack.name,
            'line-rate': pack.lineRate,
            'branch-rate':pack.branchRate,
            complexity:pack.complexity
        });
    }

    function appendClass(ar, classInfo) {
        var classLine = X.createTagStart('class', {
            name: classInfo.name,
            filename: classInfo.filename,
            'line-rate': classInfo.lineRate,
            'branch-rate': classInfo.branchRate,
            complexity: classInfo.complexity
        });
        X.append(ar, classLine, 4);
        X.append(ar, '<methods></methods>', 5);
        appendLines(ar, classInfo.lines);
        X.append(ar, '</class>', 4);
    }

    function appendLines(ar, lines) {
        X.append(ar, '<lines>', 5);
        lines.forEach(function(line) {
            createLineXml(ar, line);
        });
        X.append(ar, '</lines>', 5);
    }

    function createLineXml(ar, line) {
        var lineStart = X.createTagStart('line', {
            number: line.number,
            hits: line.hits,
            branch: false
        });
        X.append(ar, lineStart + '</line>', 6);
    }

})();