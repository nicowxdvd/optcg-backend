import { Inject, Injectable } from '@nestjs/common';
import { LEADERS_READ_REPOSITORY, type LeadersReadRepositoryPort } from './ports/leaders-read.repository.port';
import { ListLeadersDto } from './dto/list-leaders.dto';
import { PaginatedLeadersDto } from './dto/paginated-leaders.dto';
import { toResponse } from './mappers/leader.mapper';

@Injectable()
export class LeadersService {

    constructor(
        @Inject(LEADERS_READ_REPOSITORY) private readonly leadersRead: LeadersReadRepositoryPort,
    ) {}

    

    async list({ page, limit, name, code, color, trait }: ListLeadersDto): Promise<PaginatedLeadersDto> {
        const { items, total } = await this.leadersRead.findPage((page - 1) * limit, limit, {name, code, color, trait});

        return {
            items      : items.map(leader => toResponse(leader)),
            total,
            page,
            totalPages : Math.ceil(total / limit),
        };
    }

}
