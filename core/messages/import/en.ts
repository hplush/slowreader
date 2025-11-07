import { count } from '@nanostores/i18n'

import { i18n } from '../../i18n.ts'

export const importMessages = i18n('import', {
  brokenFileError: 'File is corrupted',
  cannotReadError: 'Unable to read the file',
  description:
    '**OPML** file can be exported from your previous RSS reader. See settings or feeds management sections.\n\nSlow Reader **backup** can be generated in [Export] page.',
  existsError: 'Feed already added',
  feedsAdded: count({
    many: '{count} feeds imported',
    one: '{count} feed imported'
  }),
  goToFeeds: 'Go to feeds',
  loadError: 'Feed Errors',
  noFeedsError: 'No feeds found in the file',
  submit: 'Import OPML or backup',
  title: 'Import',
  unknownError: 'Feed was not found at this URL',
  unknownFormatError: 'File is not OPML or app backup',
  unloadableError: "Can't open feed's website"
})
