const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'modals', 'ExploreMenuModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove state declarations
content = content.replace(/const \[isMapVisible, setIsMapVisible\] = useState\(false\);\n/g, '');
content = content.replace(/const \[isNotepadVisible, setIsNotepadVisible\] = useState\(false\);\n/g, '');
content = content.replace(/const \[isAboutVisible, setIsAboutVisible\] = useState\(false\);\n/g, '');
content = content.replace(/const \[isEventsVisible, setIsEventsVisible\] = useState\(false\);\n/g, '');
content = content.replace(/const \[isHolidaysVisible, setIsHolidaysVisible\] = useState\(false\);\n/g, '');
content = content.replace(/const \[isResultsVisible, setIsResultsVisible\] = useState\(false\);\n/g, '');
content = content.replace(/const \[isMaterialsVisible, setIsMaterialsVisible\] = useState\(false\);\n/g, '');

// 2. Remove from dependency array
content = content.replace(/, isMapVisible, isNotepadVisible, isAboutVisible, isEventsVisible, isHolidaysVisible, isResultsVisible, isMaterialsVisible/g, '');

// 3. Remove hardware back press logic for these
content = content.replace(/if \(isMapVisible\) \{ setIsMapVisible\(false\); return true; \}\n/g, '');
content = content.replace(/if \(isNotepadVisible\) \{ setIsNotepadVisible\(false\); return true; \}\n/g, '');
content = content.replace(/if \(isAboutVisible\) \{ setIsAboutVisible\(false\); return true; \}\n/g, '');
content = content.replace(/if \(isEventsVisible\) \{ setIsEventsVisible\(false\); return true; \}\n/g, '');
content = content.replace(/if \(isHolidaysVisible\) \{ setIsHolidaysVisible\(false\); return true; \}\n/g, '');
content = content.replace(/if \(isResultsVisible\) \{ setIsResultsVisible\(false\); return true; \}\n/g, '');
content = content.replace(/if \(isMaterialsVisible\) \{ setIsMaterialsVisible\(false\); return true; \}\n/g, '');

// 4. Update setters
content = content.replace(/setIsMapVisible\(true\)/g, "handleSubScreenOpen('campus-map')");
content = content.replace(/setIsNotepadVisible\(true\)/g, "handleSubScreenOpen('notepad')");
content = content.replace(/setIsEventsVisible\(true\)/g, "handleSubScreenOpen('events')");
content = content.replace(/setIsHolidaysVisible\(true\)/g, "handleSubScreenOpen('holidays')");
content = content.replace(/setIsMaterialsVisible\(true\)/g, "handleSubScreenOpen('study-materials')");
content = content.replace(/setIsResultsVisible\(true\)/g, "handleSubScreenOpen('results')");

// 5. Replace bottom modal renders with activeView cases inside the Animated.View switch
const modalsBlockRegex = /\{\/\* Floating Modals for Map & Notepad \*\/\}[\s\S]*?\{\/\* Additional Campus Modals \*\/\}[\s\S]*?<\/View>/;
const activeViewBlock = `
              {activeView === 'campus-map' && (
                <CampusMapModal visible={true} onClose={handleBack} isEmbedded={true} />
              )}
              {activeView === 'notepad' && (
                <NotepadModal visible={true} onClose={handleBack} />
              )}
              {activeView === 'about' && (
                <AboutModal visible={true} onClose={handleBack} isEmbedded={true} />
              )}
              {activeView === 'events' && (
                <EventsModal visible={true} onClose={handleBack} isEmbedded={true} />
              )}
              {activeView === 'holidays' && (
                <HolidaysModal visible={true} onClose={handleBack} isEmbedded={true} />
              )}
              {activeView === 'results' && (
                <ResultsWebModal visible={true} onClose={handleBack} isEmbedded={true} />
              )}
              {activeView === 'study-materials' && (
                <StudyMaterialsModal visible={true} onClose={handleBack} isEmbedded={true} />
              )}
`;

// Insert the new activeView cases at the end of the existing activeView cases (e.g. before </View>\n</Animated.View>)
const lastActiveViewRegex = /\{activeView === 'library' && \([\s\S]*?<\/View>/;
const match2 = content.match(lastActiveViewRegex);
if (match2) {
    content = content.replace(match2[0], `${match2[0].replace('</View>', '')}${activeViewBlock}</View>`);
    // Then delete the old floating modals
    content = content.replace(modalsBlockRegex, '</View>');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('ExploreMenuModal updated successfully!');
} else {
    console.log('Regex failed to find library activeView');
}

