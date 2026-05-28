import { Component, OnInit, VERSION } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ParametersService } from 'app/main/services/parameters.service';

@Component({
  selector: 'app-exam-seatno-barcodes-stickers-gu',
  templateUrl: './exam-seatno-barcodes-stickers-gu.component.html',
  styleUrls: ['./exam-seatno-barcodes-stickers-gu.component.scss']
})
export class ExamSeatnoBarcodesStickersGuComponent implements OnInit {

  name = 'Angular ' + VERSION.major;
  params: any;
  studentname: any;
  hallticket_number: any;
  omr_serial_no: any;
  omr_barcode: any;
  examName: any;
  collegaName: any;
  collegeName: any;
  bulk: boolean;
  bulkdata: any;
  father_name: any;
  caste: any;
  date_of_birth: any;
  gender: any;
  aadhar_card_no: any;
  printHn: boolean = false
  barcodeNo: boolean = false
  groupedByBundleData = [];


  constructor(private route: ActivatedRoute, private router: Router, private parameterService: ParametersService) { }

  ngOnInit(): void {
    this.route.queryParams
      .subscribe(params => {
        this.params = params;
        if (params.data) {
          this.bulk = true;
          this.bulkdata = JSON.parse(params.data);
        }
        const grouped = this.groupBySubjectId(this.bulkdata);
        this.groupedByBundleData = Object.entries(grouped);
        if (this.params.printHn == 'false') {
          this.printHn = false;
        } else {
          this.printHn = true;
        }
        if (this.params.barcodeNo == 'false') {
          this.barcodeNo = false;
        } else {
          this.barcodeNo = true;
        }
      });

  }
  groupBySubjectId(data: any[]): { [subjectId: string]: any[] } {
    return data.reduce((acc, item) => {
      const subjectId = item.pk_subject_id;
      if (!acc[subjectId]) {
        acc[subjectId] = [];
      }
      acc[subjectId].push(item);
      return acc;
    }, {});
  }

  printPage(_printsection: any) {
    window.print();
  }

  printBack() {
    this.router.navigate(['admin-examination-management/exam-papers-delivery-process/exam-seatno-barcodes'])
  }
}
