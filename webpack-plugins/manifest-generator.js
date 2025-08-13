const fs = require('fs');
const path = require('path');

class ManifestGeneratorPlugin {
  constructor(options = {}) {
    this.options = {
      templatePath: 'manifest.template.json',
      outputPath: 'manifest.json',
      iconSuffix: '',
      ...options
    };
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap('ManifestGeneratorPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'ManifestGeneratorPlugin',
          stage: compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
        },
        () => {
          try {
            // Read template file
            const templatePath = path.resolve(this.options.templatePath);
            const templateContent = fs.readFileSync(templatePath, 'utf8');

            // Replace placeholders
            const manifestContent = templateContent.replace(
              /\{\{ICON_SUFFIX\}\}/g,
              this.options.iconSuffix
            );

            // Add to webpack assets
            compilation.emitAsset(this.options.outputPath, {
              source: () => manifestContent,
              size: () => manifestContent.length
            });
          } catch (error) {
            compilation.errors.push(error);
          }
        }
      );
    });
  }
}

module.exports = ManifestGeneratorPlugin;
