steal('steal/instrument/coberturaReporter.js', function() {

    function createLinesUsed(coveredLines, notCoveredLines, blankLines) {
        if (blankLines === undefined) blankLines = 0;
        var r= {};
        for (var i=0; i<coveredLines; i++) {
            r[i] = 1;
        }
        for (i=0; i<notCoveredLines; i++) {
            r[coveredLines + blankLines + i] = 0;
        }
        return r;
    }

    function createFileData(coveredLines, notCoveredLines, blankLines) {
        if (blankLines === undefined) blankLines = 0;
        var codeLines = coveredLines + notCoveredLines;
        return {
            linesUsed: createLinesUsed(coveredLines, notCoveredLines, blankLines),
            lineCoverage: coveredLines / codeLines,
            blockCoverage: -1,
            lines: codeLines + blankLines,
            blocks: -1
        }
    }

    function createCoverageData() {
        return {
            files: {
                'p1/f1.js': createFileData(8, 2, 4),
                'p1/f2.js': createFileData(10, 0),
                'p1/f3.js': createFileData(0, 10),
                'p2/f4.js': createFileData(6, 4),
                'p2/p3/f5.js': createFileData(4, 6),
                'p2/p3/f6.js': createFileData(2, 8)
            },
            total: {
                lineCoverage: 0.5,
                blockCoverage: -1,
                lines: 60,
                blocks: -1
            }
        }
    }

	describe('_createClassInfo', function() {
        var _createClassInfo= steal.instrument.coberturaReporter._createClassInfo;

		it('given a file name and its data, it will create class and line info', function() {
            var classInfo= _createClassInfo('p1/f1.js', createFileData(2, 1));
            expect(classInfo.name).toBe('p1.f1');
            expect(classInfo.filename).toBe('p1/f1.js');
            expect(classInfo.lineRate).toBeCloseTo(0.66, 0.001);
            expect(classInfo.branchRate).toBe('1.0');
            expect(classInfo.complexity).toBe('1.0');

            expect(classInfo.methods).toEqual([]);
            expect(classInfo.lines.length).toBe(2);
            expect(classInfo.lines[0].number).toBe(0);
            expect(classInfo.lines[0].hits).toBe(1);
            expect(classInfo.lines[0].branch).toBe(false);
            expect(classInfo.lines[1].number).toBe(1);
        })
	});

    describe('_createPackageInfo', function() {
        var _createPackageInfo= steal.instrument.coberturaReporter._createPackageInfo;

        it('for a set of files in the same directory, it will create package info', function() {
            var pack = _createPackageInfo('p1/p2', {
               'p1/p2/f1.js': createFileData(2, 1),
               'p1/p2/f2.js': createFileData(4, 2)
            });

            expect(pack.name).toBe('p1.p2');
            expect(pack.lineRate).toBeCloseTo(0.66, 0.001);
            expect(pack.branchRate).toBe('1.0');
            expect(pack.complexity).toBe('1.0');

            expect(pack.classes.length).toBe(2);
            expect(pack.classes[0].name).toBe('p1.p2.f1');
            expect(pack.classes[0].filename).toBe('p1/p2/f1.js');
            expect(pack.classes[1].name).toBe('p1.p2.f2');
            expect(pack.classes[1].filename).toBe('p1/p2/f2.js');
        });

        it('will produce package info files sorted', function() {
            var pack = _createPackageInfo('p1/p2', {
                'p1/p2/f2.js': createFileData(2, 1),
                'p1/p2/f1.js': createFileData(4, 2)
            });
            expect(pack.classes[0].filename).toBe('p1/p2/f1.js');
            expect(pack.classes[1].filename).toBe('p1/p2/f2.js');
        })

    });

    describe('_groupFilesByPackage', function() {
        var _groupFilesByPackage = steal.instrument.coberturaReporter._groupFilesByPackage;

        it('groups given files by package sorted', function() {
            var files = {
                'p2/f7.js': createFileData(1, 0),
                'p1/f1.js': createFileData(1, 0),
                'p1/f2.js': createFileData(1, 0),
                'p1/p2/f3.js': createFileData(1, 0),
                'p1/p2/f4.js': createFileData(1, 0),
                'p1/p2/f5.js': createFileData(1, 0),
                'p2/f6.js': createFileData(1, 0)
            };
            var groups= _groupFilesByPackage(files);

            expect(groups.length).toBe(3);
            expect(groups[0].packageName).toBe('p1');
            expect(groups[1].packageName).toBe('p1/p2');
            expect(groups[2].packageName).toBe('p2');

            expect(groups[0].files).toEqual({
                'p1/f1.js': files['p1/f1.js'],
                'p1/f2.js': files['p1/f2.js']
            });

            expect(groups[1].files).toEqual({
                'p1/p2/f3.js': files['p1/p2/f3.js'],
                'p1/p2/f4.js': files['p1/p2/f4.js'],
                'p1/p2/f5.js': files['p1/p2/f5.js']
            });

            expect(groups[2].files).toEqual({
                'p2/f6.js': files['p2/f6.js'],
                'p2/f7.js': files['p2/f7.js']
            });

        });

    });

    describe('_createPackages', function() {
        var _createPackages= steal.instrument.coberturaReporter._createPackages;
        var files = {
            'p2/f7.js': createFileData(1, 0),
            'p1/f1.js': createFileData(10, 2, 3),
            'p1/f2.js': createFileData(1, 0),
            'p1/p2/f3.js': createFileData(1, 0),
            'p1/p2/f4.js': createFileData(1, 0),
            'p1/p2/f5.js': createFileData(1, 0),
            'p2/f6.js': createFileData(1, 0)
        };

        it('create packages for given files', function() {
            var packages = _createPackages(files);
            expect(packages.length).toBe(3);

            var p1= packages[0];
            expect(p1.name).toBe('p1');
            expect(p1.lineRate).toBe(11/13);
            expect(p1.classes.length).toBe(2);

            expect(packages[1].name).toBe('p1.p2');
            expect(packages[2].name).toBe('p2');
        });

        it('calculates lines totals', function() {
            var packages = _createPackages(files);

            expect(packages.linesCovered).toBe(16);
            expect(packages.linesOfCode).toBe(18);
            expect(packages.linesTotal).toBe(21);
        });
    })


    describe('createReport', function() {
        var createReport= steal.instrument.coberturaReporter.createReport;

        it('creates empty report for no files', function() {
            var xml= createReport();
            var lines = xml.split('\n');
            expect(lines[0]).toBe('<?xml version="1.0"?>');
            expect(lines[1]).toBe('<!DOCTYPE coverage SYSTEM "http://cobertura.sourceforge.net/xml/coverage-04.dtd">');
            var coverageLine = lines[2];
            coverageLine = coverageLine.substring(0, coverageLine.indexOf(' timestamp='));
            expect(coverageLine).toBe('<coverage line-rate="0.0" branch-rate="1.0" lines-covered="0" lines-valid="0" branches-covered="0" branches-valid="0" complexity="1.0" version="1.9.4.1"');

            expect(lines[3]).toBe('\t<sources>');
            expect(lines[4]).toBe('\t</sources>');

            expect(lines[5]).toBe('\t<packages>');
            expect(lines[6]).toBe('\t</packages>');
            expect(lines[7]).toBe('</coverage>');
        });

        it('creates a report for one class when given one file', function() {
            var files = {
                'p1/f1.js': createFileData(2, 2, 3)
            };
            var coverageData= {
                files: files
            };
            var xml= createReport(coverageData);
            var lines = xml.split('\n');

            var coverageLine = lines[2];
            coverageLine = coverageLine.substring(0, coverageLine.indexOf(' timestamp='));
            expect(coverageLine).toBe('<coverage line-rate="0.5" branch-rate="1.0" lines-covered="2" lines-valid="7" branches-covered="0" branches-valid="0" complexity="1.0" version="1.9.4.1"');

            expect(lines[6]).toBe('\t\t<package name="p1" line-rate="0.5" branch-rate="1.0" complexity="1.0">');
            expect(lines[7]).toBe('\t\t\t<classes>');
            expect(lines[8]).toBe('\t\t\t\t<class name="p1.f1" filename="p1/f1.js" line-rate="0.5" branch-rate="1.0" complexity="1.0">');
            expect(lines[9]).toBe('\t\t\t\t\t<methods></methods>');
            expect(lines[10]).toBe('\t\t\t\t\t<lines>');
            expect(lines[11]).toBe('\t\t\t\t\t\t<line number="0" hits="1" branch="false"></line>');
            expect(lines[12]).toBe('\t\t\t\t\t\t<line number="1" hits="1" branch="false"></line>');

            expect(lines[13]).toBe('\t\t\t\t\t</lines>');
            expect(lines[14]).toBe('\t\t\t\t</class>');
            expect(lines[15]).toBe('\t\t\t</classes>');
            expect(lines[16]).toBe('\t\t</package>');
            expect(lines[17]).toBe('\t</packages>');
            expect(lines[18]).toBe('</coverage>');
        });

    });

});