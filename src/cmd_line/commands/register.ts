import * as vscode from 'vscode';

import { VimState } from '../../state/vimState';
import { Register } from '../../register/register';
import { RecordedState } from '../../state/recordedState';
import * as node from '../node';
import { StatusBar } from '../../statusBar';
import { VimError, ErrorCode } from '../../error';

export interface IRegisterCommandArguments extends node.ICommandArgs {
  registers: string[];
}
export class RegisterCommand extends node.CommandBase {
  protected _arguments: IRegisterCommandArguments;

  constructor(args: IRegisterCommandArguments) {
    super();
    this._arguments = args;
  }

  get arguments(): IRegisterCommandArguments {
    return this._arguments;
  }

  private async getRegisterDisplayValue(
    vimState: VimState,
    register: string
  ): Promise<string | undefined> {
    let result = (await Register.get(vimState, register))?.text;
    if (result instanceof Array) {
      result = result.join('\n').substr(0, 100);
    } else if (result instanceof RecordedState) {
      result = result.actionsRun.map((x) => x.keysPressed.join('')).join('');
    }

    return result;
  }

  async displayRegisterValue(vimState: VimState, register: string): Promise<void> {
    let result = await this.getRegisterDisplayValue(vimState, register);
    if (result === undefined) {
      StatusBar.displayError(vimState, VimError.fromCode(ErrorCode.NothingInRegister));
    } else {
      result = result.replace(/\n/g, '\\n');
      vscode.window.showInformationMessage(`${register} ${result}`);
    }
  }

  async execute(vimState: VimState): Promise<void> {
    if (this.arguments.registers.length === 1) {
      await this.displayRegisterValue(vimState, this.arguments.registers[0]);
    } else {
      const currentRegisterKeys = Register.getKeys().filter(
        (reg) =>
          reg !== '_' &&
          (this.arguments.registers.length === 0 || this.arguments.registers.includes(reg))
      );
      const registerKeyAndContent = new Array<vscode.QuickPickItem>();

      for (let registerKey of currentRegisterKeys) {
        registerKeyAndContent.push({
          label: registerKey,
          description: await this.getRegisterDisplayValue(vimState, registerKey),
        });
      }

      vscode.window.showQuickPick(registerKeyAndContent).then(async (val) => {
        if (val) {
          let result = val.description;
          vscode.window.showInformationMessage(`${val.label} ${result}`);
        }
      });
    }
  }
}
