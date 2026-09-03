import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { HomeService } from './home.service';
import { Public } from '../../../common/decorators/public.decorator';
import { OptionalUser } from '../../../common/decorators/optional-user.decorator';
import { HomeFeedDto, SearchSuggestionsDto } from './dto/home.response.dto';
import { ApiEnvelope } from '../../../common/decorators/api-envelope.decorator';

@ApiTags('Discovery · Home')
@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Public()
  @Get('feed')
  @ApiOperation({
    summary: 'Everything above the Home meal feed in one call',
    description:
      'Greeting, goal chips, categories, featured kitchens, recommended meals, trending reels and any active order. Personalises when a bearer token is present, works signed-out too.',
  })
  @ApiEnvelope(HomeFeedDto, { description: 'Everything above the Home meal feed' })
  async feed(@OptionalUser() user?: User) {
    return { message: 'Home feed fetched', data: await this.homeService.getFeed(user?.id) };
  }

  @Public()
  @Get('search-suggestions')
  @ApiOperation({ summary: 'Trending searches shown on the empty Search screen' })
  @ApiEnvelope(SearchSuggestionsDto)
  async suggestions() {
    return {
      message: 'Suggestions fetched',
      data: await this.homeService.getSearchSuggestions(),
    };
  }
}
