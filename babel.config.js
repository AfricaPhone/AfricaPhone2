module.exports = function (api) {
  api.cache(true);
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      // Supprimer les console.log en production pour la sécurité et les performances
      isProduction && 'transform-remove-console',
    ].filter(Boolean),
  };
};
