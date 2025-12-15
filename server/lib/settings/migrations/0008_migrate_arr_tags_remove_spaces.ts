import RadarrAPI from '@server/api/servarr/radarr';
import SonarrAPI from '@server/api/servarr/sonarr';
import { getRepository } from '@server/datasource';
import { User } from '@server/entity/User';
import type { AllSettings } from '@server/lib/settings';

const migrationArrTagsRemoveSpaces = async (
  settings: any
): Promise<AllSettings> => {
  if (
    Array.isArray(settings.migrations) &&
    settings.migrations.includes('0008_migrate_arr_tags_remove_spaces')
  ) {
    return settings;
  }

  const userRepository = getRepository(User);
  const users = await userRepository.find({
    select: ['id'],
  });

  let errorOccurred = false;

  for (const radarrSettings of settings.radarr || []) {
    if (!radarrSettings.tagRequests) {
      continue;
    }
    try {
      const radarr = new RadarrAPI({
        apiKey: radarrSettings.apiKey,
        url: RadarrAPI.buildUrl(radarrSettings, '/api/v3'),
      });
      const radarrTags = await radarr.getTags();

      for (const user of users) {
        const userTag = radarrTags.find((v) =>
          v.label.startsWith(user.id + '-')
        );
        if (!userTag || !userTag.label.includes(' ')) {
          continue;
        }
        await radarr.renameTag({
          id: userTag.id,
          label: userTag.label.replace(/\s+/g, '-'),
        });
      }
    } catch (error) {
      console.error(
        `Unable to remove spaces from Radarr tags. Please check your Radarr connection settings for the instance "${radarrSettings.name}".`,
        error.message
      );
      errorOccurred = true;
    }
  }

  for (const sonarrSettings of settings.sonarr || []) {
    if (!sonarrSettings.tagRequests) {
      continue;
    }
    try {
      const sonarr = new SonarrAPI({
        apiKey: sonarrSettings.apiKey,
        url: SonarrAPI.buildUrl(sonarrSettings, '/api/v3'),
      });
      const sonarrTags = await sonarr.getTags();

      for (const user of users) {
        const userTag = sonarrTags.find((v) =>
          v.label.startsWith(user.id + '-')
        );
        if (!userTag || !userTag.label.includes(' ')) {
          continue;
        }
        await sonarr.renameTag({
          id: userTag.id,
          label: userTag.label.replace(/\s+/g, '-'),
        });
      }
    } catch (error) {
      console.error(
        `Unable to remove spaces from Sonarr tags. Please check your Sonarr connection settings for the instance "${sonarrSettings.name}".`,
        error.message
      );
      errorOccurred = true;
    }
  }

  if (!errorOccurred) {
    if (!Array.isArray(settings.migrations)) {
      settings.migrations = [];
    }
    settings.migrations.push('0008_migrate_arr_tags_remove_spaces');
  }
  return settings;
};

export default migrationArrTagsRemoveSpaces;
