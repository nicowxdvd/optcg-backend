import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { PaginatedLeadersDto } from './dto/paginated-leaders.dto';
import { LeadersService } from './leaders.service';
import { ListLeadersDto } from './dto/list-leaders.dto';

@Controller('leaders')
export class LeadersController {

    constructor(
        private readonly leadersService: LeadersService
    ) {}


    @Get()
    @ApiOkResponse({ type : PaginatedLeadersDto })
    list( @Query() query: ListLeadersDto ): Promise<PaginatedLeadersDto> {
        return this.leadersService.list(query)

    }

}
