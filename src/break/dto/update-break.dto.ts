import { PartialType } from '@nestjs/mapped-types';
import { CreateBreakDto } from './create-break.dto';

export class UpdateBreakDto extends PartialType(CreateBreakDto) {}
