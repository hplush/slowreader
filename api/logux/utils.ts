import type { ActionCreator } from '@logux/actions'
import type { Action } from '@logux/core'

export function defineAction<CreatedAction extends Action>(
  type: CreatedAction['type']
): ActionCreator<CreatedAction, [Omit<CreatedAction, 'type'>]> {
  function creator(fields: Omit<CreatedAction, 'type'>): CreatedAction {
    return { type, ...fields } as CreatedAction
  }
  creator.type = type
  creator.match = (action: Action): action is CreatedAction => {
    return action.type === type
  }
  return creator
}
