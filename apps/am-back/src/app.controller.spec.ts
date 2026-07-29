import { AppController } from './app.controller';
import { ImagesService } from './db/services/images.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(() => {
    appController = new AppController({} as ImagesService, undefined);
  });

  describe('fakeHandlerThree', () => {
    it('should return an empty list', async () => {
      await expect(appController.fakeHandlerThree(1)).resolves.toEqual([]);
    });
  });
});
