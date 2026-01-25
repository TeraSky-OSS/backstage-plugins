import { LoggerWrapper } from './LoggerWrapper';

describe('LoggerWrapper', () => {
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
  };

  let wrapper: LoggerWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    wrapper = new LoggerWrapper(mockLogger as any);
  });

  it('should delegate error calls to underlying logger', () => {
    wrapper.error('test error', { key: 'value' });
    expect(mockLogger.error).toHaveBeenCalledWith('test error', { key: 'value' });
  });

  it('should delegate warn calls to underlying logger', () => {
    wrapper.warn('test warning', { key: 'value' });
    expect(mockLogger.warn).toHaveBeenCalledWith('test warning', { key: 'value' });
  });

  it('should delegate info calls to underlying logger', () => {
    wrapper.info('test info', { key: 'value' });
    expect(mockLogger.info).toHaveBeenCalledWith('test info', { key: 'value' });
  });

  it('should delegate debug calls to underlying logger', () => {
    wrapper.debug('test debug', { key: 'value' });
    expect(mockLogger.debug).toHaveBeenCalledWith('test debug', { key: 'value' });
  });

  it('should create child wrapper', () => {
    const childWrapper = wrapper.child({ component: 'test' });
    expect(mockLogger.child).toHaveBeenCalledWith({ component: 'test' });
    expect(childWrapper).toBeInstanceOf(LoggerWrapper);
  });
});

