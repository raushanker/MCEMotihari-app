const fs = require('fs');
const { SourceMapConsumer } = require('source-map');

const mapPath = './android/app/build/generated/sourcemaps/react/release/index.android.bundle.map';
if (!fs.existsSync(mapPath)) {
  console.error('Map file does not exist at:', mapPath);
  process.exit(1);
}

const rawSourceMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const columns = [235872, 236112, 295180, 138193, 177859, 678462, 660365, 668811];

SourceMapConsumer.with(rawSourceMap, null, consumer => {
  columns.forEach(col => {
    console.log(`\nResolving 1:${col}...`);
    const pos = consumer.originalPositionFor({
      line: 1,
      column: col
    });
    console.log(pos);
  });
});

