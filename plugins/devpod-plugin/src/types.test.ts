import { DevpodIDE, DevpodConfig } from './types';

describe('DevpodIDE enum', () => {
  it('should have VSCODE value', () => {
    expect(DevpodIDE.VSCODE).toBe('vscode');
  });

  it('should have CURSOR value', () => {
    expect(DevpodIDE.CURSOR).toBe('cursor');
  });

  it('should have INTELLIJ value', () => {
    expect(DevpodIDE.INTELLIJ).toBe('intellij');
  });

  it('should have PYCHARM value', () => {
    expect(DevpodIDE.PYCHARM).toBe('pycharm');
  });

  it('should have multiple IDE options', () => {
    const ideValues = Object.values(DevpodIDE);
    expect(ideValues.length).toBeGreaterThan(10);
  });

  it('should have CLION value', () => {
    expect(DevpodIDE.CLION).toBe('clion');
  });

  it('should have CODIUM value', () => {
    expect(DevpodIDE.CODIUM).toBe('codium');
  });

  it('should have DATASPELL value', () => {
    expect(DevpodIDE.DATASPELL).toBe('dataspell');
  });

  it('should have FLEET value', () => {
    expect(DevpodIDE.FLEET).toBe('fleet');
  });

  it('should have GOLAND value', () => {
    expect(DevpodIDE.GOLAND).toBe('goland');
  });

  it('should have JUPYTERNOTEBOOK value', () => {
    expect(DevpodIDE.JUPYTERNOTEBOOK).toBe('jupyternotebook');
  });

  it('should have OPENVSCODE value', () => {
    expect(DevpodIDE.OPENVSCODE).toBe('openvscode');
  });

  it('should have PHPSTORM value', () => {
    expect(DevpodIDE.PHPSTORM).toBe('phpstorm');
  });

  it('should have POSITRON value', () => {
    expect(DevpodIDE.POSITRON).toBe('positron');
  });

  it('should have RIDER value', () => {
    expect(DevpodIDE.RIDER).toBe('rider');
  });

  it('should have RSTUDIO value', () => {
    expect(DevpodIDE.RSTUDIO).toBe('rstudio');
  });

  it('should have RUBYMINE value', () => {
    expect(DevpodIDE.RUBYMINE).toBe('rubymine');
  });

  it('should have RUSTROVER value', () => {
    expect(DevpodIDE.RUSTROVER).toBe('rustrover');
  });

  it('should have VSCODE_INSIDERS value', () => {
    expect(DevpodIDE.VSCODE_INSIDERS).toBe('vscode-insiders');
  });

  it('should have WEBSTORM value', () => {
    expect(DevpodIDE.WEBSTORM).toBe('webstorm');
  });

  it('should have ZED value', () => {
    expect(DevpodIDE.ZED).toBe('zed');
  });
});

describe('DevpodConfig interface', () => {
  it('should allow creating config with defaultIde', () => {
    const config: DevpodConfig = {
      defaultIde: DevpodIDE.VSCODE,
    };
    expect(config.defaultIde).toBe(DevpodIDE.VSCODE);
  });

  it('should allow creating config without defaultIde', () => {
    const config: DevpodConfig = {};
    expect(config.defaultIde).toBeUndefined();
  });
});

